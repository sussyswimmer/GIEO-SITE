'use client';

import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  FrontSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  SRGBColorSpace,
  TextureLoader,
  type IUniform,
  type Material,
  type Object3D,
  type Texture,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { SCENE_FADE } from '@/lib/motion';
import { useMotionStore } from '@/lib/motion-store';

const FOV = 35;
const DIST = 10;
const GLB = '/models/weave.glb';
const CLOTH = '/models/weave-cloth.webp';
const deg = (d: number) => (d * Math.PI) / 180;
const smooth = MathUtils.smoothstep; // (x, min, max)
const lerp = MathUtils.lerp;
const easeOut = (x: number) => 1 - (1 - x) ** 2;
const easeInOut = (x: number) => (x < 0.5 ? 2 * x * x : 1 - (2 - 2 * x) ** 2 / 2);
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Hero thread geometry (stage units): ribbon origin y and length, so a head position maps straight to s.
const THREAD_TOP = 3.4;
const THREAD_LEN = 3.76;
const HERO_Y = 0.36; // where the hero thread meets the panel's top edge
const RADIUS = 1.3; // carousel
const CAROUSEL_Z = -1.3;
// Start values, tune by eye.
const HEAD_TINT = 0.55;
const COASTER_TILT = deg(62);
const ARC = deg(25);
const STATIONS = [
  { name: 'StationTote', angle: 0, hw: 0.3 },
  { name: 'StationMug', angle: ARC, hw: 0.3 },
  { name: 'StationCoaster', angle: 2 * ARC, hw: 0.29 },
] as const;

// Both preloaded so the GLB and the texture travel in parallel instead of one after the other.
useLoader.preload(GLTFLoader, GLB, (l) => l.setMeshoptDecoder(MeshoptDecoder));
useLoader.preload(TextureLoader, CLOTH);

type ClothUniforms = Record<'uYarns' | 'uYarn' | 'uRows' | 'uReveal' | 'uHeadCol' | 'uHeadAmt', IUniform>;

// One function for every cloth material: the same reference keeps the program cache key equal, and each
// material still carries its own uniforms. Material.clone() does not copy onBeforeCompile, hence the factory.
function clothCompile(this: Material, shader: WebGLProgramParametersWithUniforms) {
  Object.assign(shader.uniforms, (this.userData as { u: ClothUniforms }).u);
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
uniform float uYarns, uYarn, uRows, uReveal, uHeadAmt;
uniform vec3 uHeadCol;`,
    )
    .replace(
      '#include <map_fragment>',
      `#include <map_fragment>
vec2 c = vMapUv * uYarns, id = floor(c), f = fract(c);
float over = mod(id.x + id.y, 2.);
float prof = over < .5 ? sin(PI * f.x) : sin(PI * f.y);
prof = mix(prof, .64, smoothstep(.14, .28, max(fwidth(c.x), fwidth(c.y)))); // undersampled yarn aliases into figures, so it must flatten early
diffuseColor.rgb *= mix(1., .92 + .125 * prof, uYarn);
float i = floor((1. - vMapUv.y) * uRows);
float u = mod(i, 2.) < 1. ? vMapUv.x : 1. - vMapUv.x;
float k = uReveal * (uRows + 1.) - i - u;
diffuseColor.a *= smoothstep(0., .12, k - .07 * over);
float e = min(min(vMapUv.x, 1. - vMapUv.x), min(vMapUv.y, 1. - vMapUv.y));
diffuseColor.a *= smoothstep(0., 1.5 * fwidth(e), e);
if (diffuseColor.a < .003) discard;
float head = smoothstep(0., .05, k) * (1. - smoothstep(.05, .22, k));
diffuseColor.rgb = mix(diffuseColor.rgb, uHeadCol, head * uHeadAmt);`,
    );
}

function makeCloth(map: Texture, yarns: number, yarn: number, lift: [number, number, number], headCol: Color): MeshPhysicalMaterial {
  const m = new MeshPhysicalMaterial({
    map,
    roughness: 0.9,
    metalness: 0,
    sheen: 0,
    transparent: true,
    side: FrontSide, // DoubleSide would draw twice, with two programs
  });
  m.color.setRGB(...lift);
  m.userData.u = {
    uYarns: { value: yarns },
    uYarn: { value: yarn },
    uRows: { value: 16 },
    uReveal: { value: 1 },
    uHeadCol: { value: headCol.clone().multiply(m.color) }, // same lift as the cloth, or the lights darken the head
    uHeadAmt: { value: HEAD_TINT },
  } satisfies ClothUniforms;
  m.onBeforeCompile = clothCompile;
  return m;
}

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
    const band = makeCloth(cloth, 164, 0, [1.1, 1.42, 1.38], headCol);
    // No yarn on the coaster: its tilt and turn shear the grid into a rhomb lattice, which reads as a pattern.
    const top = makeCloth(cloth, 74, 0, [1.01, 1.17, 1.21], headCol);

    const body = () => {
      const m = new MeshPhysicalMaterial({
        vertexColors: true,
        roughness: 0.8,
        metalness: 0,
        sheen: 1,
        sheenRoughness: 0.45,
        sheenColor: new Color(token('--peach-glow')),
        transparent: true,
        side: FrontSide,
      });
      m.color.setRGB(1.1, 1.43, 1.39);
      return m;
    };
    const tote = body();
    const mug = body();
    const coaster = body();
    coaster.color.setRGB(1.01, 1.17, 1.21); // tilted to the light, so the camera-facing lift would clip

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
      ToteBody: [tote, 0],
      Handle_F: [tote, 0],
      Handle_B: [tote, 0],
      MugBody: [mug, 0],
      MugBand: [band, 1],
      CoasterBody: [coaster, 0],
      CoasterTop: [top, 1],
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
      band,
      top,
      tote,
      mug,
      coaster,
      ribbon,
      ru,
      panelMesh: panelMesh as Mesh | null,
      carousel: byName('Carousel'),
      stations: STATIONS.map((s) => byName(s.name)),
      turnTote: byName('TurnTote'),
      turnMug: byName('TurnMug'),
      turnCoaster: byName('TurnCoaster'),
      pivots: [byName('HandlePivot_F'), byName('HandlePivot_B')],
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
      [rig.panel, rig.band, rig.top, rig.tote, rig.mug, rig.coaster, rig.ribbon].forEach((m) => m.dispose());
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

    // Drape: eight keys, hand-weighted. influences[a - 1] = 1 - f, influences[a] = f.
    const inf = rig.panelMesh?.morphTargetInfluences;
    if (inf) {
      inf.fill(0);
      const x = w.drape * inf.length;
      const a = Math.min(Math.floor(x), inf.length);
      const f = x - a;
      if (a >= 1) inf[a - 1] = 1 - f;
      if (a < inf.length) inf[a] = f;
    }
    const handles = -1.35 * (1 - smooth(w.drape, 0.55, 1));
    rig.pivots.forEach((pv) => (pv.rotation.x = handles));

    // Products: the carousel turns about a far axis, in place of a camera arc.
    const rot = ARC * easeInOut(w.mug) + ARC * easeInOut(w.coaster);
    rig.carousel.position.set(0, 0, CAROUSEL_Z);
    rig.carousel.rotation.y = -rot;
    const groups = [[rig.panel, rig.tote], [rig.band, rig.mug], [rig.top, rig.coaster]];
    STATIONS.forEach((s, k) => {
      // Faded by the product's edge, not its centre; a station at zero opacity is not drawn.
      const op = (1 - smooth(Math.abs(RADIUS * Math.sin(s.angle - rot)) + s.hw, 0.5, 0.7)) * exit;
      rig.stations[k].visible = op > 0.003;
      groups[k][0].opacity = op;
      groups[k][1].opacity = op * (k === 0 ? smooth(w.drape, 0.3, 0.8) : 1);
      groups[k][1].visible = groups[k][1].opacity > 0.003; // at opacity 0 it would still write depth and punch through the cloth
    });

    // Each product turns to its hero pose on its own beat.
    const et = easeInOut(w.tote);
    rig.turnTote.rotation.set(lerp(0.1, 0.06, et), lerp(-0.16, -deg(12), et), 0);
    rig.turnMug.rotation.set(0, lerp(-deg(14), deg(12), easeInOut(w.mug)), 0);
    rig.turnCoaster.rotation.set(COASTER_TILT, lerp(0, deg(18), easeInOut(w.coaster)), 0);
  });

  return (
    <group ref={place} visible={false}>
      <primitive object={rig.root} />
    </group>
  );
}
