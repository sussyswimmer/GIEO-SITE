'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PMREMGenerator,
  ShaderMaterial,
  Vector3,
  type Vector2,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CLOTH_AT, CLOTH_STITCH, CLOTH_YARNS, ROOT_AT, ROOTS_FROM, ROOTS_SPAN, rootStages, rootsT, type RootStages } from '@/lib/roots';
import { approach } from '@/lib/showroom';
import { tube, type TubeUniforms } from './VineScene';
import { token } from './weave-materials';

/**
 * The seam, live (src/lib/roots.ts has the timing): a fixed canvas over the page. The sprout's roots grow
 * down out of the soil (their tops ride the page as the hero scrolls away), fan out and straighten into
 * the warp threads of the cloth, which is fitted to the weave film's finished cloth (its frame 89) in the
 * sticky weave stage; more warps run down between them; the weft weaves across from the top. Then this
 * canvas fades as the film's cloth fades in on the same spot (--film-in on the stage), and the film
 * drapes it into the Nối Bag. Draws only while the run is on screen; redraws on scroll, not on a timer.
 */

const FOV = 35;
const DIST = 10;
const N_ROOTS = 13;
const THREAD_R = 0.34 / CLOTH_YARNS; // a warp's radius, in cloth widths: threads, with air between them

const sstep = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: string, b: string, t: number) => new Color(token(a)).lerp(new Color(token(b)), t);

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

// The woven cloth, matched to the film's (plain weave, pink weft over cream warps, one mint warp): each
// weft row is laid from the top down, travelling left then right, so the cloth weaves as uReveal rises.
const CLOTH_FRAG = /* glsl */ `
#define PI 3.141592653589793
varying vec2 vUv;
uniform float uReveal, uYarns, uStitch;
uniform vec3 uWarp, uWeft, uMint;
void main() {
  vec2 c = vec2(vUv.x, 1. - vUv.y) * uYarns;
  vec2 id = floor(c), f = fract(c);
  float u = mod(id.y, 2.) < 1. ? vUv.x : 1. - vUv.x;
  float k = uReveal * (uYarns + 1.) - id.y - u;
  float a = smoothstep(0., .18, k);
  if (a < .01) discard;
  float over = mod(id.x + id.y, 2.);
  float stitch = 1. - step(.5, abs(id.x - floor(uYarns * uStitch)));
  vec3 col = over < .5 ? uWeft : mix(uWarp, uMint, stitch);
  float prof = over < .5 ? sin(PI * f.y) : sin(PI * f.x);
  float gap = smoothstep(0., .2, f.x) * smoothstep(0., .2, 1. - f.x) * smoothstep(0., .2, f.y) * smoothstep(0., .2, 1. - f.y);
  col *= (.7 + .36 * prof) * mix(.46, 1., gap);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;

function build() {
  let s = 23;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const wood = mix('--ink', '--peach-glow', 0.34);
  const thread = mix('--peach-glow', '--petal-soft', 0.5).multiplyScalar(0.72); // the film's dusty cream under these lights
  const mint = new Color(token('--stem-mint'));
  const stitch = Math.floor(CLOTH_YARNS * CLOTH_STITCH);

  // Roots, in their own space: x across in cloth widths (0 under the sprout's centre line), y = -t from
  // the sprout (0) to the top of the cloth (-1). The frame sets one sheared matrix that pins the top to
  // the sprout and the bottom to the cloth, however far apart the scroll has pulled them.
  const roots = new Group();
  roots.matrixAutoUpdate = false;
  const fed = new Set<number>();
  // Which warp each root feeds: spread across the cloth but unevenly, and out of order, so roots cross.
  const targets = Array.from({ length: N_ROOTS }, (_, i) => {
    const even = (i * (CLOTH_YARNS - 1)) / (N_ROOTS - 1);
    return Math.max(0, Math.min(CLOTH_YARNS - 1, Math.round(even + (rnd() - 0.5) * 3.2)));
  });
  for (const [a, b] of [[1, 3], [5, 6], [8, 10], [11, 12]]) [targets[a], targets[b]] = [targets[b], targets[a]];
  type Strand = ReturnType<typeof tube> & { grow: (st: RootStages) => number };
  const strands: Strand[] = [];
  const mains: CatmullRomCurve3[] = [];
  targets.forEach((idx, i) => {
    fed.add(idx);
    const x = (idx + 0.5) / CLOTH_YARNS - 0.5;
    // Nothing regular about a root: where it leaves the plant, how soon it turns for its thread (some run
    // out sideways first, some drop and then wander over), how much it meanders, and how high above the
    // cloth it has become a straight thread, all differ from root to root.
    const from = (rnd() - 0.5) * 0.035;
    const arrive = 0.5 + rnd() * 0.42;
    const bend = 0.55 + rnd() * 1.5;
    const amp = 0.04 + rnd() * 0.09;
    const f1 = 4 + rnd() * 5;
    const f2 = 9 + rnd() * 7;
    const ph = rnd() * 6.28;
    const depth = (rnd() - 0.5) * 0.22;
    const pts: Vector3[] = [];
    for (let t = 0; t <= 1.0001; t += 0.04) {
      const q = Math.min(1, t / arrive);
      const e = Math.pow(sstep(q, 0, 1), bend);
      const loose = Math.sin(Math.PI * q) * (q < 1 ? 1 : 0);
      pts.push(
        new Vector3(
          from * (1 - e) + x * e + amp * loose * (Math.sin(t * f1 + ph) + 0.45 * Math.sin(t * f2 + ph * 1.7)),
          -t,
          depth * loose + 0.03 * Math.sin(t * 7 + ph) * loose,
        ),
      );
    }
    const curve = new CatmullRomCurve3(pts);
    mains.push(curve);
    const fat = 1.5 + rnd() * 1.6 + (i === Math.floor(N_ROOTS / 2) ? 0.9 : 0); // one taproot, thicker than the rest
    const delay = Math.abs(x) * 0.25 + rnd() * 0.12;
    const tb = tube(curve, THREAD_R * fat, wood, idx === stitch ? mint : thread, 120, 1 / fat, 0.9, 1, 1);
    roots.add(tb.mesh);
    // to 1.04, not 1: the tube's growing tip is tapered, and a finished root must meet its thread at full width
    strands.push({ ...tb, grow: (st: RootStages) => 1.04 * sstep(st.roots, delay, Math.min(1, delay + 0.7)) });
  });
  // Rootlets: thin side roots that leave the main ones, wander off and end in the earth.
  for (let j = 0; j < 22; j++) {
    const parent = mains[Math.floor(rnd() * mains.length)];
    const u = 0.1 + rnd() * 0.5;
    const o = parent.getPointAt(u);
    const dir = (rnd() < 0.5 ? -1 : 1) * (0.05 + rnd() * 0.16);
    const drop = 0.05 + rnd() * 0.16;
    const ph = rnd() * 6.28;
    const pts: Vector3[] = [];
    for (let t = 0; t <= 1.0001; t += 0.125) {
      pts.push(new Vector3(o.x + dir * Math.pow(t, 0.8) + 0.02 * Math.sin(t * 9 + ph) * t, o.y - drop * t - 0.02 * Math.sin(t * 6 + ph) * t, o.z + (rnd() - 0.5) * 0.03 * t));
    }
    const at = Math.min(0.9, u * 0.9 + rnd() * 0.15);
    const tb = tube(new CatmullRomCurve3(pts), THREAD_R * (0.5 + rnd() * 0.6), wood, wood, 28, 0.12, 0.6, 1, 1);
    roots.add(tb.mesh);
    strands.push({ ...tb, grow: (st: RootStages) => 1.04 * sstep(st.roots, at, Math.min(1, at + 0.3)) });
  }

  // The cloth, in its own box: x and y from -0.5 to 0.5, set to the film's cloth each frame.
  const cloth = new Group();
  const warpGeo = new CylinderGeometry(1, 1, 1, 8);
  warpGeo.translate(0, -0.5, 0); // hangs from its top
  const warpMat = new MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
  // Twisted yarn, not a rod: plies wind round each thread (a diagonal shade from its own coordinates).
  warpMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vYarn;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvYarn = vec3(position.x, (instanceMatrix * vec4(position, 1.)).y, position.z);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vYarn;`)
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
float ply = .5 + .5 * sin(atan(vYarn.x, vYarn.z) * 2. + vYarn.y * 420.);
diffuseColor.rgb *= .7 + .38 * ply;`,
      );
  };
  const warps = new InstancedMesh(warpGeo, warpMat, CLOTH_YARNS);
  const delays = Array.from({ length: CLOTH_YARNS }, (_, j) => (fed.has(j) ? 0 : 0.12 + rnd() * 0.3));
  for (let j = 0; j < CLOTH_YARNS; j++) warps.setColorAt(j, j === stitch ? mint : thread);
  warps.frustumCulled = false;
  const weftMat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: CLOTH_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: {
      uReveal: { value: 0 },
      uYarns: { value: CLOTH_YARNS },
      uStitch: { value: CLOTH_STITCH },
      uWarp: { value: thread.clone().multiplyScalar(1.2) }, // unlit here, so brought up to how the lit threads read
      uWeft: { value: new Color(token('--petal-soft')).lerp(new Color(token('--peach-glow')), 0.25).multiplyScalar(0.94) },
      uMint: { value: mint },
    },
  });
  const weft = new Mesh(new PlaneGeometry(1, 1), weftMat);
  weft.position.z = 0.03;
  weft.renderOrder = 2;
  cloth.add(warps, weft);

  return { roots, strands, cloth, warps, warpGeo, warpMat, delays, weft, weftMat };
}

function Roots() {
  const { gl, scene, size, invalidate } = useThree();
  const root = useRef<Group>(null);
  const shown = useRef<number | null>(null);
  const settled = useRef(false); // the state for where the scroll rests (before or after the run) is applied
  const dummy = useMemo(() => new Object3D(), []);
  const rig = useMemo(build, []);

  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.4;
    // Outside its run this scene must cost nothing: it does not even ask for a frame (a full-screen canvas
    // redrawn on every scroll made the weave film stutter). One last frame applies the end state.
    const ask = () => {
      const top = document.getElementById('craft')?.getBoundingClientRect().top ?? 0;
      const vh = window.innerHeight;
      const inRun = top < (ROOTS_FROM + 0.3) * vh && top > (ROOTS_FROM - ROOTS_SPAN - 0.3) * vh;
      if (!inRun && settled.current) return;
      invalidate();
    };
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    invalidate();
    return () => {
      window.removeEventListener('scroll', ask);
      window.removeEventListener('resize', ask);
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
      document.querySelector<HTMLElement>('#craft .weave-stage')?.style.removeProperty('--film-in');
      rig.strands.forEach(({ mesh, mat }) => {
        mesh.geometry.dispose();
        mat.dispose();
      });
      rig.warpGeo.dispose();
      rig.warpMat.dispose();
      rig.warps.dispose();
      rig.weft.geometry.dispose();
      rig.weftMat.dispose();
    };
  }, [gl, scene, invalidate, rig]);

  useFrame(() => {
    const g = root.current;
    const craft = document.getElementById('craft');
    const stage = document.querySelector<HTMLElement>('#craft .weave-stage');
    const film = document.querySelector<HTMLElement>('#hero [data-film]');
    const ds = film?.dataset;
    if (!g || !craft || !stage || !film || !ds?.set || !ds.size || !ds.focus || !ROOT_AT[ds.set]) {
      if (g) g.visible = false;
      return;
    }
    const target = rootsT(craft.getBoundingClientRect().top, window.innerHeight);
    shown.current = shown.current === null ? target : approach(shown.current, target);
    if (shown.current !== target) invalidate();
    const st = rootStages(shown.current);
    // The film's cloth shows only as far as this scene has handed over; before the run and during it, not at all.
    stage.style.setProperty('--film-in', String(st.handoff));
    gl.domElement.style.opacity = String(1 - st.handoff);
    g.visible = shown.current > 0.001 && st.handoff < 1;
    gl.domElement.style.visibility = g.visible ? 'visible' : 'hidden'; // no layer to composite while empty
    settled.current = !g.visible && shown.current === target;
    if (!g.visible) return;

    // Screen px to world on the z = 0 plane (the canvas is the whole viewport).
    const h = 2 * Math.tan((FOV * Math.PI) / 360) * DIST;
    const px = h / size.height;
    const wx = (x: number) => (x - size.width / 2) * px;
    const wy = (y: number) => -(y - size.height / 2) * px;

    // Where the sprout stands: the seed film's root point, through the film's cover fit.
    const [fw, fh] = ds.size.split(',').map(Number);
    const [fx, fy] = ds.focus.split(',').map(Number);
    const box = film.getBoundingClientRect();
    const k = Math.max(box.width / fw, box.height / fh);
    const [rx, ry] = ROOT_AT[ds.set];
    const sx = wx(box.left + (box.width - fw * k) * fx + rx * fw * k);
    const sy = wy(box.top + (box.height - fh * k) * fy + (ry - 0.004) * fh * k); // at the foot of the stem: the first of each root is buried

    // Where the film's finished cloth is, in its stage.
    const sr = stage.getBoundingClientRect();
    const cw = (CLOTH_AT[2] - CLOTH_AT[0]) * sr.width * px;
    const ch = (CLOTH_AT[3] - CLOTH_AT[1]) * sr.height * px;
    const cx = wx(sr.left + ((CLOTH_AT[0] + CLOTH_AT[2]) / 2) * sr.width);
    const top = wy(sr.top + CLOTH_AT[1] * sr.height);

    // Roots: (x, -t, z) to the world, pinned to the sprout at t = 0 and to the cloth's top edge at t = 1.
    rig.roots.matrix.set(cw, sx - cx, 0, sx, 0, sy - top, 0, sy, 0, 0, cw, 0, 0, 0, 0, 1);
    rig.roots.matrixWorldNeedsUpdate = true;
    // The soil in the seed film: from its surface at the sprout to the foot of the frame.
    const soilTop = wy(box.top + (box.height - fh * k) * fy + (ry - 0.012) * fh * k);
    const soilEnd = wy(box.top + (box.height - fh * k) * fy + 0.985 * fh * k);
    rig.strands.forEach((tb) => {
      const u = tb.mat.userData.u as TubeUniforms;
      (u.uSoil.value as Vector2).set(soilTop, soilEnd);
      u.uGrow.value = tb.grow(st);
      tb.mesh.visible = u.uGrow.value > 0.001;
    });

    rig.cloth.position.set(cx, top - ch / 2, 0);
    rig.cloth.scale.set(cw, ch, cw);
    rig.delays.forEach((d, j) => {
      const grown = sstep(st.warps, d, d + 0.58);
      dummy.position.set((j + 0.5) / CLOTH_YARNS - 0.5, 0.5, 0);
      const thick = grown > 0.002 ? THREAD_R : 0; // not begun: nothing at all, not a dot on the top edge
      dummy.scale.set(thick, Math.max(1e-4, grown), thick);
      dummy.updateMatrix();
      rig.warps.setMatrixAt(j, dummy.matrix);
    });
    rig.warps.instanceMatrix.needsUpdate = true;
    rig.weftMat.uniforms.uReveal.value = st.weave;
    rig.weft.visible = st.weave > 0.001;
  });

  return (
    <group ref={root} visible={false}>
      <primitive object={rig.roots} />
      <primitive object={rig.cloth} />
    </group>
  );
}

// A context can fail: the weave film then shows its cloth as it would without this scene.
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    document.querySelector<HTMLElement>('#craft .weave-stage')?.style.removeProperty('--film-in');
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function RootsCanvas() {
  const [cream, petal] = useMemo(() => [token('--cream'), token('--petal-soft')], []);
  return (
    <Boundary>
      <Canvas
        flat
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        camera={{ fov: FOV, position: [0, 0, DIST] }}
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <hemisphereLight args={[cream, petal, 1]} />
        <directionalLight position={[-3, 5, 4]} color={cream} intensity={1.5} />
        <Roots />
      </Canvas>
    </Boundary>
  );
}
