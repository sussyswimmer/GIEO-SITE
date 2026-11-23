'use client';

import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Material,
  type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { SCENE_FADE } from '@/lib/motion';
import { useMotionStore } from '@/lib/motion-store';
import { type ClothUniforms, makeBody, makeCloth, setDrape, token } from './weave-materials';

/**
 * Legacy: the home page's live weave (threads, a woven panel that drapes, then the products on a carousel),
 * unmounted since the redesign (nothing sets `near.weave`); the home page plays the weave as a film. Kept
 * compiling against today's weave.glb: the panel drapes toward the Nối Bag and gives way to it, the carousel
 * then turns to the Nếp Keychain. The products wear their Blender vertex colours here (the showroom's brocade
 * shader is not used). The store's `bag` beat turns the bag; `lipstick` turns the carousel and the keychain.
 */
const FOV = 35;
const DIST = 10;
const GLB = '/models/weave.glb';
const CLOTH = '/models/weave-cloth.webp';
const deg = (d: number) => (d * Math.PI) / 180;
const smooth = MathUtils.smoothstep; // (x, min, max)
const lerp = MathUtils.lerp;
const easeOut = (x: number) => 1 - (1 - x) ** 2;
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (2 - 2 * x) ** 2 / 2);

// Hero thread geometry (stage units): ribbon origin y and length, so a head position maps straight to s.
const THREAD_TOP = 3.4;
const THREAD_LEN = 3.76;
const HERO_Y = 0.36; // where the hero thread meets the panel's top edge
const RADIUS = 1.3; // carousel
const CAROUSEL_Z = -1.3;
// Start values, tune by eye.
const ARC = deg(25);
const STATIONS = [
  { name: 'StationBag', angle: 0, hw: 0.42 },
  { name: 'StationLipstick', angle: ARC, hw: 0.2 },
] as const;

// Both preloaded so the GLB and the texture travel in parallel instead of one after the other.
useLoader.preload(GLTFLoader, GLB, (l) => l.setMeshoptDecoder(MeshoptDecoder));
useLoader.preload(TextureLoader, CLOTH);

export default function WeaveScene() {
  const gltf = useLoader(GLTFLoader, GLB, (l) => l.setMeshoptDecoder(MeshoptDecoder));
  const cloth = useLoader(TextureLoader, CLOTH);
  const { gl, scene, camera, size, invalidate } = useThree();
  const place = useRef<Group>(null);
  const ready = useRef(false);

  const rig = useMemo(() => {
    const root = gltf.scene;
    const byName = (n: string) => root.getObjectByName(n) as Object3D;
    cloth.flipY = false; // glTF UV origin
    cloth.colorSpace = SRGBColorSpace;
    cloth.anisotropy = 4;
    cloth.wrapS = cloth.wrapT = ClampToEdgeWrapping;

    const headCol = new Color(token('--cream')); // mint over peach reads as mud
    // The shared lights tint the cloth; these multipliers invert them at each surface's hero normal.
    const panel = makeCloth(cloth, 64, 1, [1.1, 1.42, 1.38], headCol);
    const bag = makeBody();
    const lipstick = makeBody();

    const ribbon = new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: DoubleSide });
    ribbon.forceSinglePass = true;
    const ru = {
      uHero: { value: 0 },
      uWarps: { value: 0 },
      uClipY: { value: 1e3 },
      uBand: { value: 0.05 },
    };
    ribbon.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, ru);
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uHero, uWarps;
varying float vS, vH, vY;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
vS = uv.y;
vH = uv.x < .001 ? uHero : uWarps - uv.x;
vY = (modelMatrix * vec4(position, 1.)).y;`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
uniform float uClipY, uBand;
varying float vS, vH, vY;`,
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
diffuseColor.a *= (1. - smoothstep(vH - .012, vH, vS)) * (1. - smoothstep(uClipY - uBand, uClipY, vY));`,
        );
    };

    const mats: Record<string, [Material, number]> = {
      Panel: [panel, 2],
      NoiBody: [bag, 0],
      NoiBand: [bag, 0],
      NoiHandle: [bag, 0],
      LipBody: [lipstick, 0],
      LipFront: [lipstick, 0],
      LipFlap: [lipstick, 0],
      LipButton: [lipstick, 0],
      LipLoop: [lipstick, 0],
      LipClasp: [lipstick, 0],
      Threads: [ribbon, 1],
    };
    let panelMesh: Mesh | null = null;
    root.traverse((o) => {
      const hit = mats[o.name];
      if (!hit || !(o as Mesh).isMesh) return;
      const mesh = o as Mesh;
      [mesh.material, mesh.renderOrder] = hit;
      // The morphs and the clip travel outside the base bounds.
      if (o.name === 'Panel' || o.name === 'Threads') mesh.frustumCulled = false;
      if (o.name === 'Panel') panelMesh = mesh;
    });

    return {
      root,
      panel,
      bag,
      lipstick,
      ribbon,
      ru,
      panelMesh: panelMesh as Mesh | null,
      carousel: byName('Carousel'),
      stations: STATIONS.map((s) => byName(s.name)),
      turnBag: byName('TurnBag'),
      turnLipstick: byName('TurnLipstick'),
      handle: byName('NoiHandlePivot'),
      threads: byName('Threads'),
    };
  }, [gltf, cloth]);

  useEffect(() => {
    const p = place.current!;
    // Compile with everything visible once, off the scroll path. The cached scene keeps its last visibility on a remount.
    p.visible = true;
    rig.threads.visible = true;
    rig.stations.forEach((s) => (s.visible = true));
    let live = true;
    void gl.compileAsync(scene, camera).then(() => {
      if (!live) return;
      gl.initTexture(cloth);
      ready.current = true;
      document.documentElement.dataset.weave = 'ready';
      invalidate();
    });
    p.visible = false;
    return () => {
      live = false;
      ready.current = false;
      delete document.documentElement.dataset.weave;
    };
  }, [gl, scene, camera, cloth, invalidate, rig]);

  useEffect(
    () => () => {
      [rig.panel, rig.bag, rig.lipstick, rig.ribbon].forEach((m) => m.dispose());
    },
    [rig],
  );

  useFrame(() => {
    const p = place.current;
    if (!p) return;
    const { weave: w, progress } = useMotionStore.getState();
    const stage = document.querySelector('[data-scene-stage="weave"]');
    const exit = Math.min(1, (1 - progress.weave) / SCENE_FADE);
    p.visible = ready.current && !!stage && w.thread > 0 && exit > 0;
    if (!p.visible || !stage) return;

    const h = 2 * Math.tan((FOV * Math.PI) / 360) * DIST;
    const wv = h * (size.width / size.height);
    const r = stage.getBoundingClientRect();
    const unit = (Math.min(r.width, r.height) / size.height) * h; // authored in stage units
    p.position.x = ((r.left + r.width / 2) / size.width - 0.5) * wv;
    p.position.y = -((r.top + r.height / 2) / size.height - 0.5) * h;
    p.scale.setScalar(unit);
    const worldY = (py: number) => -(py / size.height - 0.5) * h;
    const localY = (py: number) => (worldY(py) - p.position.y) / unit;

    // The mint thread comes from behind the Meaning note, then from the viewport top once the note is gone.
    const note = document.querySelector('[data-thread-clear]');
    const noteBottom = note ? note.getBoundingClientRect().bottom : 0;
    const yStart = Math.min(THREAD_TOP, localY(Math.max(noteBottom, 0)));
    const yHead = w.warps > 0 ? lerp(HERO_Y, -HERO_Y, easeOut(w.warps)) : lerp(yStart, HERO_Y, easeOut(w.thread));
    const u = rig.ru;
    u.uHero.value = (THREAD_TOP - yHead) / THREAD_LEN;
    u.uWarps.value = w.warps * 1.14;
    u.uBand.value = 0.05 * unit;
    u.uClipY.value = noteBottom > 0 ? worldY(noteBottom) - 0.05 * unit : 1e3;

    // Cloth: rows fill with the weave; the strands fade once it drapes.
    const threadFade = 1 - smooth(w.drape, 0, 0.18);
    rig.ribbon.opacity = threadFade * exit;
    rig.threads.visible = threadFade > 0;
    (rig.panel.userData.u as ClothUniforms).uReveal.value = w.weave;
    // The drape leans the cloth into the sky light, where the camera-facing lift would clip to yellow.
    const lean = Math.sin(Math.PI * w.drape);
    rig.panel.color.setRGB(1.1 * (1 - 0.1 * lean), 1.42 * (1 - 0.15 * lean), 1.38 * (1 - 0.12 * lean));

    setDrape(rig.panelMesh, w.drape);
    rig.handle.rotation.x = -1.35 * (1 - smooth(w.drape, 0.55, 1)); // the strap lifts as the bag arrives

    // Products: the carousel turns about a far axis, in place of a camera arc.
    const rot = ARC * easeInOut(w.lipstick);
    rig.carousel.position.set(0, 0, CAROUSEL_Z);
    rig.carousel.rotation.y = -rot;
    STATIONS.forEach((s, k) => {
      // Faded by the product's edge, not its centre; a station at zero opacity is not drawn.
      const op = (1 - smooth(Math.abs(RADIUS * Math.sin(s.angle - rot)) + s.hw, 0.5, 0.7)) * exit;
      rig.stations[k].visible = op > 0.003;
      if (k === 0) {
        // The draped panel gives way to the bag. At opacity 0 a material still writes depth, so hide it.
        rig.panel.opacity = op * (1 - smooth(w.drape, 0.6, 1));
        rig.bag.opacity = op * smooth(w.drape, 0.3, 0.8);
        rig.bag.visible = rig.bag.opacity > 0.003;
      } else rig.lipstick.opacity = op;
    });

    // Each product turns to its hero pose on its own beat.
    const et = easeInOut(w.bag);
    rig.turnBag.rotation.set(lerp(0.1, 0.06, et), lerp(-0.16, -deg(12), et), 0);
    rig.turnLipstick.rotation.set(0, lerp(-deg(14), deg(12), easeInOut(w.lipstick)), 0);
  });

  return (
    <group ref={place} visible={false}>
      <primitive object={rig.root} />
    </group>
  );
}
