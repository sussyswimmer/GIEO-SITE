'use client';

import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  Box3,
  Color,
  FrontSide,
  Group,
  Matrix4,
  Mesh,
  MeshPhysicalMaterial,
  MathUtils,
  Object3D,
  Quaternion,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { SCENE_FADE } from '@/lib/motion';
import { useMotionStore } from '@/lib/motion-store';

const FOV = 35;
const DIST = 10;
const SEEDS = 7;
const AXIS_X = new Vector3(1, 0, 0);
const easeOut = (x: number) => 1 - (1 - x) ** 2;
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (2 - 2 * x) ** 2 / 2);
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

type Pivot = { node: Object3D; closed: Quaternion; open: number; order: number };

export default function LotusScene() {
  const gltf = useLoader(GLTFLoader, '/models/lotus.glb', (l) => l.setMeshoptDecoder(MeshoptDecoder));
  const { gl, scene, camera, size, invalidate } = useThree();
  const place = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  const seedGroup = useRef<Group>(null);

  const rig = useMemo(() => {
    const root = gltf.scene;
    const main = new MeshPhysicalMaterial({
      vertexColors: true,
      roughness: 0.6,
      metalness: 0,
      sheen: 1,
      sheenRoughness: 0.45,
      sheenColor: new Color(token('--peach-glow')),
      transparent: true,
      side: FrontSide,
    });
    // Clones share one program with `main`; transparent is never toggled at runtime (it would recompile).
    const stem = main.clone();
    stem.depthWrite = false; // the faded tail must not punch holes in the petals behind it
    const seed = main.clone();

    const pivots: Pivot[] = [];
    let template: Mesh | null = null;
    root.traverse((o) => {
      if (o.name === 'Seed') template = o as Mesh;
      else if ((o as Mesh).isMesh) (o as Mesh).material = o.name === 'Stem' ? stem : main;
      if (o.name.startsWith('Pivot_'))
        pivots.push({ node: o, closed: o.quaternion.clone(), open: o.userData.open, order: o.userData.order });
    });

    // The seed template sits at the pod top; each clone keeps its node transform but is centred on that point.
    const tpl = template as unknown as Mesh;
    tpl.visible = false;
    root.updateMatrixWorld(true);
    const toRoot = new Matrix4().copy(root.matrixWorld).invert().multiply(tpl.matrixWorld);
    const centre = new Box3().setFromObject(tpl).applyMatrix4(new Matrix4().copy(root.matrixWorld).invert()).getCenter(new Vector3());
    const seeds = Array.from({ length: SEEDS }, (_, k) => {
      const mesh = new Mesh(tpl.geometry, seed);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(toRoot).premultiply(new Matrix4().makeTranslation(-centre.x, -centre.y, -centre.z));
      const holder = new Group();
      holder.add(mesh);
      const a = (k / (SEEDS - 1)) * Math.PI * 2;
      const ring = k === SEEDS - 1 ? new Vector3() : new Vector3(Math.cos(a) * 0.045, 0, Math.sin(a) * 0.045);
      return { holder, start: centre.clone().add(ring) };
    });
    return { root, main, stem, seed, pivots, seeds };
  }, [gltf]);

  useEffect(() => {
    const p = place.current!;
    const s = seedGroup.current!;
    // Compile with everything visible once, off the scroll path.
    p.visible = true;
    s.visible = true;
    let live = true;
    void gl.compileAsync(scene, camera).then(() => {
      if (!live) return;
      document.documentElement.dataset.lotus = 'ready';
      invalidate();
    });
    p.visible = false;
    s.visible = false;
    return () => {
      live = false;
      delete document.documentElement.dataset.lotus;
    };
  }, [gl, scene, camera, invalidate]);

  useEffect(() => () => [rig.main, rig.stem, rig.seed].forEach((m) => m.dispose()), [rig]);

  const q = useMemo(() => new Quaternion(), []);
  const v = useMemo(() => new Vector3(), []);

  useFrame(() => {
    const p = place.current;
    const t = tilt.current;
    const sg = seedGroup.current;
    if (!p || !t || !sg) return;
    const { lotus, progress } = useMotionStore.getState();
    const stage = document.querySelector('[data-scene-stage="lotus"]');
    const exit = Math.min(1, (1 - progress.lotus) / SCENE_FADE);
    p.visible = !!stage && lotus.rise > 0 && exit > 0;
    sg.visible = p.visible && lotus.finale > 0;
    if (!p.visible || !stage) return;

    const h = 2 * Math.tan((FOV * Math.PI) / 360) * DIST;
    const w = h * (size.width / size.height);
    const r = stage.getBoundingClientRect();
    const stageH = (r.height / size.height) * h;
    const e = easeOut(lotus.rise);
    p.position.x = ((r.left + r.width / 2) / size.width - 0.5) * w;
    p.position.y = -((r.top + r.height / 2) / size.height - 0.5) * h - 0.12 * stageH - (1 - e) * 0.35 * stageH;
    p.scale.setScalar((Math.min(r.width, r.height) / size.height) * h * 0.62);
    const opacity = Math.min(1, e * 1.6, exit);
    rig.main.opacity = rig.stem.opacity = opacity;

    for (const pv of rig.pivots) {
      const beat = pv.order === 4 ? lotus.bloom : lotus[`p${pv.order}` as 'p1' | 'p2' | 'p3'];
      pv.node.quaternion.copy(pv.closed).multiply(q.setFromAxisAngle(AXIS_X, pv.open * easeInOut(beat)));
    }
    t.rotation.x = 0.25 + 0.85 * easeInOut(Math.min(1, lotus.finale / 0.6));

    // TODO(logo-svg): when GIEO's SVG exists, flatten the bloom's view depth over finale 0.6 to 1.0 and
    // crossfade it with the SVG lotus inside the stage, then add check screenshots at finale 0.9, 0.95, 1.0.
    sg.position.copy(p.position);
    sg.scale.copy(p.scale);
    if (!sg.visible) return;
    rig.seeds.forEach(({ holder, start }, k) => {
      const lt = MathUtils.clamp((lotus.finale - k * 0.06) / (1 - 0.36), 0, 1);
      v.copy(start).applyAxisAngle(AXIS_X, t.rotation.x);
      holder.position.set(v.x + Math.sin(k * 2.4) * 0.22 * lt, v.y - lt * lt * 2.6, v.z + 0.1 * lt);
      holder.rotation.z = lt * 3;
      holder.scale.setScalar(1 - MathUtils.smoothstep(lt, 0.8, 1));
    });
    rig.seed.opacity = opacity;
  });

  return (
    <>
      <group ref={place} visible={false}>
        <group ref={tilt}>
          <primitive object={rig.root} />
        </group>
      </group>
      <group ref={seedGroup} visible={false}>
        {rig.seeds.map(({ holder }, k) => (
          <primitive key={k} object={holder} />
        ))}
      </group>
    </>
  );
}
