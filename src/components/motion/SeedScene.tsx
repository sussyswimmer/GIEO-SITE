'use client';

import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AnimationMixer,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  FrontSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Points,
  PointsMaterial,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { SCENE_FADE } from '@/lib/motion';
import { useMotionStore } from '@/lib/motion-store';

const FOV = 35;
const DIST = 10;
const DUST = 120;
const FADE_IN_MS = 600;
const TILT = 0.2; // base lean toward the camera, rad
const POINTER_MAX = (3 * Math.PI) / 180;
const BOB_END = 0.15; // q where the bob has faded out
const smooth = MathUtils.smoothstep; // (x, min, max)
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export default function SeedScene() {
  const gltf = useLoader(GLTFLoader, '/models/seed.glb', (l) => l.setMeshoptDecoder(MeshoptDecoder));
  const { gl, scene, camera, size, invalidate } = useThree();
  const place = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const dust = useRef<Points>(null);
  const readyAt = useRef(0); // performance.now() when the pre-compile finished; 0 until then
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  const rig = useMemo(() => {
    const root = gltf.scene;
    const main = new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0,
      sheen: 1,
      sheenRoughness: 0.45,
      sheenColor: new Color(token('--peach-glow')),
      transparent: true,
      side: FrontSide,
    });
    // Clones share one program with `main`; transparent is never toggled at runtime (it would recompile).
    const mound = main.clone();
    // The shared lights are tuned pink for the lotus, which greys the mint; lift green and blue back to the token.
    const green = main.clone();
    green.sheen = 0;
    green.color.setRGB(1.1, 1.43, 1.39);
    const leaf = green.clone();
    leaf.side = DoubleSide;
    const thread = new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: DoubleSide });

    root.traverse((o) => {
      if (!(o as Mesh).isMesh) return;
      const mesh = o as Mesh;
      if (o.name === 'Mound') mesh.material = mound;
      else if (o.name === 'Thread') mesh.material = thread;
      else if (o.name.startsWith('Leaf_')) mesh.material = leaf;
      else if (o.name === 'Stem') mesh.material = green;
      else mesh.material = main;
      // The morphs travel far from the base bounds, so the bounds can't be trusted.
      if (o.name === 'Stem' || o.name === 'Thread' || o.name.startsWith('Leaf_')) mesh.frustumCulled = false;
    });

    const mixer = new AnimationMixer(root);
    const clip = gltf.animations[0];
    mixer.clipAction(clip).play();

    // A seeded spiral: the same dust on every visit. The height needs its own step: 0.618 mirrors the angle's and makes a helix.
    const pos = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      const a = i * 2.39996;
      const r = 0.03 + 0.17 * Math.sqrt((i + 0.5) / DUST);
      pos.set([Math.cos(a) * r, ((i * 0.7549) % 1) * 0.28, Math.sin(a) * r], i * 3);
    }
    const dustGeo = new BufferGeometry();
    dustGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    const c = document.createElement('canvas');
    c.width = c.height = 32;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    const dustMap = new CanvasTexture(c);
    const dustMat = new PointsMaterial({
      map: dustMap,
      size: 2.5,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false,
      color: new Color(token('--peach-glow')).lerp(new Color(token('--plum-ink')), 0.28),
    });
    return { root, main, mound, green, leaf, thread, mixer, clip, dustGeo, dustMap, dustMat };
  }, [gltf]);

  useEffect(() => {
    const p = place.current!;
    const d = dust.current!;
    // Compile with everything visible once, off the scroll path.
    p.visible = true;
    d.visible = true;
    let live = true;
    void gl.compileAsync(scene, camera).then(() => {
      if (!live) return;
      readyAt.current = performance.now();
      document.documentElement.dataset.seed = 'ready';
      invalidate();
    });
    p.visible = false;
    d.visible = false;
    return () => {
      live = false;
      readyAt.current = 0;
      delete document.documentElement.dataset.seed;
    };
  }, [gl, scene, camera, invalidate]);

  // 30 fps is plenty: a 6 px bob over 3 s moves under half a pixel per frame.
  // Gated on visible because this scene stays mounted after a soft navigation away from the hero.
  useEffect(() => {
    const id = setInterval(() => {
      if (place.current?.visible && useMotionStore.getState().seed < BOB_END && !document.hidden) invalidate();
    }, 33);
    return () => clearInterval(id);
  }, [invalidate]);

  // No gyro: it needs a permission prompt on iOS, and the kit bans popups.
  useEffect(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const onMove = (e: PointerEvent) => {
      pointer.current.tx = (e.clientY / innerHeight - 0.5) * 2 * POINTER_MAX;
      pointer.current.ty = (e.clientX / innerWidth - 0.5) * 2 * POINTER_MAX;
      if (place.current?.visible) invalidate();
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [invalidate]);

  useEffect(
    () => () => {
      [rig.main, rig.mound, rig.green, rig.leaf, rig.thread, rig.dustMat].forEach((m) => m.dispose());
      rig.dustGeo.dispose();
      rig.dustMap.dispose();
    },
    [rig],
  );

  useFrame(() => {
    const p = place.current;
    const t = tilt.current;
    const d = dust.current;
    if (!p || !t || !d) return;
    const { seed: q, progress } = useMotionStore.getState();
    const stage = document.querySelector('[data-scene-stage="seed"]');
    const now = performance.now();
    const appear = readyAt.current ? MathUtils.clamp((now - readyAt.current) / FADE_IN_MS, 0, 1) : 0;
    const exit = Math.min(1, (1 - progress.seed) / SCENE_FADE);
    p.visible = !!stage && appear > 0 && exit > 0;
    if (!p.visible || !stage) return;

    const h = 2 * Math.tan((FOV * Math.PI) / 360) * DIST;
    const w = h * (size.width / size.height);
    const r = stage.getBoundingClientRect();
    const bob = Math.sin((now / 3000) * Math.PI * 2) * ((6 / size.height) * h) * (1 - smooth(q, 0.02, BOB_END));
    p.position.x = ((r.left + r.width / 2) / size.width - 0.5) * w;
    p.position.y = -((r.top + r.height / 2) / size.height - 0.5) * h + bob;
    p.scale.setScalar((Math.min(r.width, r.height) / size.height) * h); // authored in stage units

    const fade = appear * exit;
    rig.main.opacity = rig.green.opacity = rig.leaf.opacity = rig.thread.opacity = fade;
    rig.mound.opacity = smooth(q, 0.08, 0.26) * fade;

    // Clamped: an action that reaches its end pauses, and later setTime calls would do nothing.
    rig.mixer.setTime(Math.min(q, 0.9999) * rig.clip.duration);

    const s = pointer.current;
    s.x += (s.tx - s.x) * 0.08;
    s.y += (s.ty - s.y) * 0.08;
    t.rotation.x = TILT + s.x;
    t.rotation.y = s.y;

    const rise = MathUtils.clamp((q - 0.3) / 0.32, 0, 1);
    d.visible = q > 0.3 && q < 0.62;
    d.position.y = -0.3 + rise * 0.22;
    rig.dustMat.opacity = 0.5 * smooth(q, 0.3, 0.38) * (1 - smooth(q, 0.52, 0.62)) * fade;

    if (appear < 1 || Math.abs(s.tx - s.x) > 0.0005 || Math.abs(s.ty - s.y) > 0.0005) invalidate();
  });

  return (
    <group ref={place} visible={false}>
      <group ref={tilt} rotation-x={TILT}>
        <primitive object={rig.root} />
        <points ref={dust} geometry={rig.dustGeo} material={rig.dustMat} visible={false} />
      </group>
    </group>
  );
}
