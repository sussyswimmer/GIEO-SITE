'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PMREMGenerator,
  SphereGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  type IUniform,
  type Material,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { approach } from '@/lib/showroom';
import { act1, fallPoint, SEED_AT, stages, type Stages } from '@/lib/vine';
import { token } from './weave-materials';

/**
 * The hero's Act 1 (src/lib/vine.ts has the timing). Its own canvas over the seed film and under the word:
 * it paints the film's backdrop (cream and ridges, the film's own `backdrop()`), so the film's seed is not
 * seen twice. A vine travels round the letters, a tree sprouts from its end, and the tree's seed falls to
 * exactly where the film's seed hangs. Then the whole canvas fades and the film carries on.
 *
 * Maxwell, 2026-11-17: it should look real, not like clay. So: leaves are shaped blades with a midrib,
 * side veins, a fold and a droop; stems carry bark (striations, woody at the base, green at the tip); the
 * vine has tendrils; blossoms have five petals; an environment map lights it all. The seed is modelled on
 * the film's own (public/film/seed/keys/l-0000.webp): a dark ribbed teardrop, point up.
 *
 * Laid out in word units, measured every frame: 1 is the height of the word's line box, x runs right from
 * its left edge, y runs up from its top edge. Everything is behind the word (it is HTML above this
 * canvas), so the vine shows in the gaps, the counters and around the letters.
 */

const FOV = 35;
const DIST = 10;

const mix = (a: string, b: string, t: number) => new Color(token(a)).lerp(new Color(token(b)), t);
const v3 = (x: number, y: number, z = 0) => new Vector3(x, y, z);
const sstep = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// The capitals inside the word's line box (word units, y up), measured from the hero at 1440 and 390:
// the vine hugs these, not the taller line box.
const CAP_TOP = -0.26;
const CAP_BOTTOM = -0.97;
const CY = (CAP_TOP + CAP_BOTTOM) / 2;
const RY = (CAP_TOP - CAP_BOTTOM) / 2 + 0.06;
const VINE_R0 = 0.017;

// ---------------------------------------------------------------------------------------------------------
// Stems: tubes that grow along their length, with bark.

export type TubeUniforms = Record<'uGrow' | 'uThick' | 'uR' | 'uTaper' | 'uBase' | 'uTip' | 'uBark' | 'uLen' | 'uBury' | 'uSoil', IUniform>;

const NOISE = /* glsl */ `
float vh(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// value noise, periodic in x (the tube's circumference), so the bark has no seam
float vn(vec2 p, float per) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3. - 2. * f);
  float a = vh(vec2(mod(i.x, per), i.y)), b = vh(vec2(mod(i.x + 1., per), i.y));
  float c = vh(vec2(mod(i.x, per), i.y + 1.)), d = vh(vec2(mod(i.x + 1., per), i.y + 1.));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}`;

// Everything past uGrow is cut and the last stretch tapers to a tip. `along` and `around` are the tube's
// own 0..1 (its uv). Bark: long striations down the stem, a finer grain, and knots that swell the stem a
// little; the colour runs from the material's (woody) to uTip (green) toward the end.
function tubeCompile(this: Material, shader: WebGLProgramParametersWithUniforms) {
  Object.assign(shader.uniforms, (this.userData as { u: TubeUniforms }).u);
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>
attribute float along;
attribute float around;
uniform float uGrow, uThick, uR, uTaper, uBase, uBark, uLen;
varying float vAlong, vAround;
varying vec2 vWorld;`,
    )
    .replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
vAlong = along;
vAround = around;
float head = 1. - smoothstep(uGrow - .03, uGrow, along);
float knot = 1. + uBark * (.1 * sin(along * uLen * 21.) + .06 * sin(along * uLen * 47. + 1.3));
// uBase: how thick it is where it starts, swelling to full: a trunk that grows out of a thinner stem
float k = mix(1., uTaper, along) * mix(.2, 1., head) * uThick * knot * mix(uBase, 1., smoothstep(0., .5, along));
transformed -= normal * uR * (1. - k);
vWorld = (modelMatrix * vec4(transformed, 1.)).xy;`,
    );
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
uniform float uGrow, uBark, uLen, uBury;
uniform vec2 uSoil;
uniform vec3 uTip;
varying float vAlong, vAround;
varying vec2 vWorld;
${NOISE}`,
    )
    .replace(
      '#include <clipping_planes_fragment>',
      // uBury (roots): between uSoil.x (the soil's surface, world y) and uSoil.y (where the soil ends) the
      // stem is in the ground. At the surface it is hidden altogether; lower down it shows in patches, as
      // if clods lay over it (noise fixed to the ground, not to the root); below the soil it is clear.
      `if (vAlong > uGrow) discard;
if (uBury > 0.) {
  float under = smoothstep(uSoil.y, uSoil.x, vWorld.y);
  float clod = .6 * vn(vWorld * 9., 4096.) + .4 * vn(vWorld * 23. + 7., 4096.);
  if (clod < under * 1.25 - .12) discard;
}
#include <clipping_planes_fragment>`,
    )
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
float streak = vn(vec2(vAround * 14., vAlong * uLen * 5.), 14.);
float grain = vn(vec2(vAround * 36., vAlong * uLen * 70.), 36.);
vec3 wood = diffuseColor.rgb * mix(1., .55 + .7 * streak, uBark) * mix(1., .82 + .36 * grain, uBark);
diffuseColor.rgb = mix(wood, uTip, smoothstep(.15, 1., vAlong));
if (uBury > 0.) diffuseColor.rgb *= mix(.45, 1., 1. - smoothstep(uSoil.y, uSoil.x, vWorld.y)); // dark with earth while in it`,
    );
}

export function tube(curve: CatmullRomCurve3, r: number, color: Color, tip: Color, segments: number, taper: number, bark: number, base: number, bury = 0) {
  const geo = new TubeGeometry(curve, segments, r, 10, false);
  const uv = geo.getAttribute('uv');
  const along = new Float32Array(uv.count);
  const around = new Float32Array(uv.count);
  for (let i = 0; i < uv.count; i++) {
    along[i] = uv.getX(i);
    around[i] = uv.getY(i);
  }
  geo.setAttribute('along', new BufferAttribute(along, 1));
  geo.setAttribute('around', new BufferAttribute(around, 1));
  const mat = new MeshStandardMaterial({ color, roughness: 0.82, metalness: 0 });
  mat.userData.u = {
    uGrow: { value: 0 },
    uThick: { value: 1 },
    uR: { value: r },
    uTaper: { value: taper },
    uBase: { value: base },
    uTip: { value: tip },
    uBark: { value: bark },
    uLen: { value: curve.getLength() },
    uBury: { value: bury },
    uSoil: { value: new Vector2(1e3, 1e3) },
  } satisfies TubeUniforms;
  mat.onBeforeCompile = tubeCompile;
  mat.customProgramCacheKey = () => 'vine-tube-3';
  return { mesh: new Mesh(geo, mat), mat };
}

// ---------------------------------------------------------------------------------------------------------
// Leaves, petals and the seed.

/** A blade along +x from its base at the origin: `half(u)` is its half-width, folded along the midrib, drooping. */
function blade(half: (u: number) => number, fold: number, droop: number, segL: number, segW: number) {
  const g = new PlaneGeometry(1, 1, segL, segW);
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const y = 2 * (uv.getY(i) - 0.5) * half(u);
    pos.setXYZ(i, u, y, fold * Math.abs(y) - droop * u * u);
  }
  g.computeVertexNormals();
  return g;
}

function leafGeometry() {
  const g = blade((u) => 0.25 * Math.pow(Math.sin(Math.PI * Math.pow(u, 0.72)), 0.85), 0.4, 0.2, 12, 6);
  g.setAttribute('leafUv', g.getAttribute('uv').clone());
  return g;
}

// A leaf's own shading on top of its instance colour: a pale midrib and side veins, darker toward the
// stalk and the edges, and a little light coming through it.
function leafCompile(shader: WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\nattribute vec2 leafUv;\nvarying vec2 vLeaf;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\nvLeaf = leafUv;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nvarying vec2 vLeaf;`)
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
float across = abs(vLeaf.y - .5);
float mid = 1. - smoothstep(.0, .035, across);
float side = abs(fract(vLeaf.x * 7. - across * 5.) - .5);
float veins = (1. - smoothstep(.0, .09, side)) * smoothstep(.03, .12, across) * (1. - smoothstep(.3, .5, across));
vec3 leaf = diffuseColor.rgb * mix(.62, 1., smoothstep(.0, .35, vLeaf.x)) * mix(1.08, .8, smoothstep(.2, .5, across));
diffuseColor.rgb = mix(leaf, leaf * 1.5 + .04, max(mid * .8, veins * .45));`,
    )
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += diffuseColor.rgb * .05;`);
}

/** Five cupped petals round a small centre, facing +z. Vertex colours: pale at the throat, pink at the rim. */
function blossomGeometry() {
  const throat = new Color(token('--cream'));
  const rim = new Color(token('--petal-soft'));
  const centre = new Color(token('--peach-glow'));
  const paint = (g: BufferGeometry, at: (i: number) => Color) => {
    const n = g.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) at(i).toArray(c, i * 3);
    g.setAttribute('color', new BufferAttribute(c, 3));
    return g;
  };
  const parts: BufferGeometry[] = [];
  for (let k = 0; k < 5; k++) {
    const p = blade((u) => 0.36 * Math.pow(Math.sin(Math.PI * Math.pow(u, 1.15)), 0.6), 0.12, -0.3, 6, 4);
    const uv = p.getAttribute('uv');
    paint(p, (i) => throat.clone().lerp(rim, sstep(uv.getX(i), 0.1, 0.8)));
    p.rotateZ((k * 2 * Math.PI) / 5);
    parts.push(p);
  }
  const eye = new SphereGeometry(0.13, 10, 8);
  eye.translate(0, 0, 0.05);
  parts.push(paint(eye, () => centre));
  const merged = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return merged ?? new SphereGeometry(0.5, 8, 6);
}

/**
 * The seed, modelled on the film's own in its first frame: a teardrop with its point up, 0.585 as wide as
 * it is tall in the film's frame (0.54 here: the film's leans a little), with shallow ribs running down it. Height 1, centred on the origin.
 */
function seedGeometry() {
  const g = new SphereGeometry(1, 56, 40);
  const pos = g.getAttribute('position');
  let widest = 0;
  // Round at the bottom (an ellipse up to its widest, 0.4 of the way up), then nearly straight sides to a point.
  const WIDEST = 0.4;
  const profile = (t: number) => {
    if (t <= WIDEST) return Math.sqrt(Math.max(0, 1 - ((WIDEST - t) / WIDEST) ** 2));
    const q = (t - WIDEST) / (1 - WIDEST);
    return Math.pow(1 - q, 0.6) * (1 + 0.45 * q);
  };
  for (let t = 0; t <= 1; t += 0.01) widest = Math.max(widest, profile(t));
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = (y + 1) / 2;
    const th = Math.atan2(pos.getZ(i), pos.getX(i));
    const r = (profile(t) / widest) * 0.272 * (1 + 0.05 * Math.cos(th * 11) * Math.sin(Math.PI * t));
    pos.setXYZ(i, r * Math.cos(th), y * 0.5, r * Math.sin(th));
  }
  g.computeVertexNormals();
  return g;
}

// ---------------------------------------------------------------------------------------------------------
// The plant.

type Tube = ReturnType<typeof tube> & { grow: (s: Stages) => number; thick: (s: Stages) => number; curve: CatmullRomCurve3 };
type Bud = { p: Vector3; rot: [number, number, number]; size: number; pop: (s: Stages, tubes: Tube[]) => number };

/**
 * The vine and the tree for the word's letters (each [left, right] in word units), with the film's seed
 * mark at (mx, my) (word units, y up). Seeded, so the same screen always grows the same plant.
 */
function buildTree(letters: [number, number][], mx: number, my: number) {
  let s = 11;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const group = new Group();
  const tubes: Tube[] = [];
  const leaves: Bud[] = [];
  const blossoms: Bud[] = [];
  // Wood from the ink and the peach, greens from the mint deepened with ink: all from the brand's tokens.
  const wood = mix('--ink', '--peach-glow', 0.34);
  const twig = mix('--ink', '--peach-glow', 0.24).lerp(new Color(token('--stem-mint')), 0.28);
  const green = mix('--stem-mint', '--ink', 0.52);
  const fresh = mix('--stem-mint', '--ink', 0.34);

  type Opt = { thick?: Tube['thick']; segs?: number; taper?: number; bark?: number; tip?: Color; base?: number };
  const add = (curve: CatmullRomCurve3, r: number, color: Color, grow: Tube['grow'], o: Opt = {}) => {
    const t = { ...tube(curve, r, color, o.tip ?? color, o.segs ?? 64, o.taper ?? 0.4, o.bark ?? 0, o.base ?? 1), grow, thick: o.thick ?? (() => 1), curve };
    tubes.push(t);
    group.add(t.mesh);
    return tubes.length - 1;
  };
  let flip = 1;
  // A leaf stands off its stem at an angle, alternating sides, its face to us and a little turned.
  const leafOn = (ti: number, u: number, size: number, order: number, vine: boolean) => {
    const curve = tubes[ti].curve;
    const tan = curve.getTangentAt(u);
    flip = -flip;
    const angle = Math.atan2(tan.y, tan.x) + flip * (0.6 + rnd() * 0.5);
    leaves.push({
      p: curve.getPointAt(u).add(v3(0, 0, 0.03)),
      rot: [(rnd() - 0.5) * 1.1, (rnd() - 0.5) * 0.6, angle],
      size,
      pop: vine
        ? (st, ts) => sstep(ts[ti].grow(st), u + 0.008, u + 0.06) // a leaf opens just behind the growing tip
        : (st, ts) => sstep(st.leaves, order * 0.7, order * 0.7 + 0.3) * sstep(ts[ti].grow(st), u, u + 0.05),
    });
  };

  // The vine's journey: from a small tip left of the first letter it weaves over the first letter, down
  // through the gap, under the next, up through the next gap, over the next, wraps once round the last
  // (the O) and climbs into the gap over the seed mark, where the trunk sprouts from it.
  const pts: Vector3[] = [v3(letters[0][0] - 0.3, CAP_BOTTOM + 0.02), v3(letters[0][0] - 0.12, CY)];
  const arc = (x0: number, x1: number, from: number, to: number, stepBy: number) => {
    const cx = (x0 + x1) / 2;
    const rx = (x1 - x0) / 2 + 0.06;
    for (let th = from; stepBy > 0 ? th <= to : th >= to; th += stepBy) {
      // a living stem wanders: a little in and out of the ellipse
      const w = 1 + 0.05 * Math.sin(th * 3.1 + x0 * 5);
      pts.push(v3(cx + rx * w * Math.cos(th), CY + RY * w * Math.sin(th), 0.1 * Math.sin(th)));
    }
  };
  letters.forEach(([x0, x1], i) => {
    if (i === letters.length - 1) arc(x0, x1, Math.PI * 0.96, -Math.PI * 1.3, -Math.PI / 10); // round the O
    else if (i % 2 === 0) arc(x0, x1, Math.PI * 0.92, Math.PI * 0.08, -Math.PI / 10); // over the top
    else arc(x0, x1, Math.PI * 1.08, Math.PI * 1.92, Math.PI / 10); // under the bottom
  });
  pts.push(v3(mx + 0.06, CAP_TOP - 0.02), v3(mx, CAP_TOP + 0.06));
  const vineCurve = new CatmullRomCurve3(pts);
  const vine = add(vineCurve, VINE_R0, twig, (st) => st.vine, { segs: 460, taper: 0.8, bark: 0.7, tip: twig });
  for (let u = 0.015; u < 0.975; u += 0.02 + rnd() * 0.025) leafOn(vine, u, 0.15 + rnd() * 0.09, 0, true);
  // Tendrils: thin green coils off the vine, each uncurling as the tip passes.
  for (let u = 0.06; u < 0.95; u += 0.1 + rnd() * 0.06) {
    const o = vineCurve.getPointAt(u);
    const tan = vineCurve.getTangentAt(u);
    const out = v3(-tan.y, tan.x).multiplyScalar(rnd() < 0.5 ? 1 : -1);
    const coil: Vector3[] = [];
    for (let t = 0; t <= 1.001; t += 0.06) {
      const a = t * Math.PI * 5;
      const r = 0.05 * (1 - 0.65 * t);
      coil.push(o.clone().addScaledVector(out, 0.03 + 0.13 * t).add(v3(Math.cos(a) * r, Math.sin(a) * r, 0.03 * Math.sin(a))));
    }
    const at = u;
    add(new CatmullRomCurve3(coil), 0.0045, fresh, (st) => sstep(st.vine, at + 0.01, at + 0.1), { segs: 48, taper: 0.5 });
  }

  // The trunk IS the vine, grown woody: it starts back along the vine's own last stretch, on the same path
  // and as thin as the vine there (uBase), and swells into the trunk as it climbs. Nothing is cut off or
  // floating: the tree comes out of the vine (Maxwell, 2026-11-17: "the tree is not connected").
  const top = CAP_TOP + 0.3;
  const VINE_R = VINE_R0;
  const TRUNK_R = 0.042;
  const lift = v3(0, 0, 0.012); // just in front of the vine it grows over
  const trunk = add(
    new CatmullRomCurve3([
      ...[0.9, 0.93, 0.96, 0.985].map((u) => vineCurve.getPointAt(u).add(lift)),
      v3(mx, CAP_TOP + 0.06, 0.012),
      v3(mx - 0.035, CAP_TOP + 0.14),
      v3(mx + 0.025, CAP_TOP + 0.22),
      v3(mx, top),
    ]),
    TRUNK_R,
    wood,
    (st) => st.trunk,
    { thick: (st) => 0.55 + 0.45 * st.trunk, segs: 72, taper: 0.6, bark: 1, tip: wood, base: (VINE_R * 0.85) / (TRUNK_R * 0.55) },
  );

  // Boughs spread low and wide over the word, alternating sides, woody then green; twigs off them.
  const span = letters[letters.length - 1][1] - letters[0][0];
  const reachScale = Math.max(0.6, span / 3.6);
  const boughs: number[] = [];
  const bloom = (p: Vector3, size: number) => {
    const o2 = rnd();
    blossoms.push({
      p: p.clone().add(v3(0, 0, 0.06)),
      rot: [(rnd() - 0.5) * 0.7, (rnd() - 0.5) * 0.7, rnd() * Math.PI],
      size,
      pop: (st) => sstep(st.blossoms, o2 * 0.6, o2 * 0.6 + 0.4),
    });
  };
  for (let i = 0; i < 9; i++) {
    const o = tubes[trunk].curve.getPointAt(0.6 + rnd() * 0.4); // on the trunk proper, above where it leaves the vine
    const sideways = i % 2 ? 1 : -1;
    const reach = (0.4 + rnd() * 1.1) * reachScale;
    const end = v3(o.x + sideways * reach, Math.min(CAP_TOP + 0.4, o.y + 0.04 + rnd() * 0.13), (rnd() - 0.5) * 0.3);
    const mid = v3(o.x + sideways * reach * 0.45, Math.min(CAP_TOP + 0.42, o.y + 0.1 + rnd() * 0.08), (rnd() - 0.5) * 0.1);
    const at = i * 0.055;
    const id = add(new CatmullRomCurve3([o, mid, end]), 0.02, wood, (st) => sstep(st.branches, at, at + 0.55), { taper: 0.3, bark: 0.9, tip: green });
    boughs.push(id);
    for (let u = 0.2; u <= 1.001; u += 0.085) leafOn(id, Math.min(1, u), 0.13 + rnd() * 0.08, rnd(), false);
    bloom(end, 0.055 + rnd() * 0.02);
  }
  for (let j = 0; j < 18; j++) {
    const b = boughs[j % boughs.length];
    const o = tubes[b].curve.getPointAt(0.3 + rnd() * 0.55);
    const end = v3(o.x + (rnd() - 0.5) * 0.42, Math.min(CAP_TOP + 0.44, o.y + 0.05 + rnd() * 0.1), (rnd() - 0.5) * 0.22);
    const at = 0.4 + j * 0.02;
    const id = add(new CatmullRomCurve3([o, o.clone().lerp(end, 0.5).add(v3(0, 0.035)), end]), 0.008, twig, (st) => sstep(st.branches, at, at + 0.4), {
      segs: 20,
      bark: 0.4,
      tip: green,
    });
    for (const u of [0.35, 0.6, 0.82, 1]) leafOn(id, u, 0.11 + rnd() * 0.07, rnd(), false);
    if (j % 3 === 0) bloom(end, 0.045 + rnd() * 0.02);
  }

  // Leaves in three natural greens (one a touch yellow); blossoms white-pink or deeper pink.
  const leafColors = [green, mix('--stem-mint', '--ink', 0.62), mix('--stem-mint', '--peach-glow', 0.25).lerp(new Color(token('--ink')), 0.48)];
  const leafMat = new MeshStandardMaterial({ roughness: 0.5, metalness: 0, side: DoubleSide });
  leafMat.onBeforeCompile = leafCompile;
  leafMat.customProgramCacheKey = () => 'vine-leaf';
  const leafMesh = new InstancedMesh(leafGeometry(), leafMat, leaves.length);
  leaves.forEach((_, i) => leafMesh.setColorAt(i, leafColors[i % 3]));
  const blossomMesh = new InstancedMesh(
    blossomGeometry(),
    new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0, side: DoubleSide }),
    blossoms.length,
  );
  const tints = [new Color(1, 1, 1), new Color(1, 1, 1).lerp(new Color(token('--lotus-pink')), 0.45)];
  blossoms.forEach((_, i) => blossomMesh.setColorAt(i, tints[i % 2]));
  leafMesh.frustumCulled = blossomMesh.frustumCulled = false;
  group.add(leafMesh, blossomMesh);

  return { group, tubes, leaves, blossoms, leafMesh, blossomMesh, hang: v3(mx + 0.02, top - 0.04), mark: v3(mx, my) };
}

type Tree = ReturnType<typeof buildTree>;

function disposeTree(t: Tree) {
  t.tubes.forEach(({ mesh, mat }) => {
    mesh.geometry.dispose();
    mat.dispose();
  });
  [t.leafMesh, t.blossomMesh].forEach((m) => {
    m.geometry.dispose();
    (m.material as Material).dispose();
    m.dispose();
  });
}

function Vine() {
  const { size, gl, scene, invalidate, clock } = useThree();
  const root = useRef<Group>(null);
  const shown = useRef<number | null>(null);
  const born = useRef<number | null>(null);
  const tree = useRef<{ key: string; t: Tree } | null>(null);
  const dummy = useMemo(() => new Object3D(), []);

  // The seed (height 1 before scaling), in the film seed's own dark brown, with a soft sheen.
  const seed = useMemo(() => {
    // Darker than the film's pixels read: the lights here are strong, and it must land on rgb(88, 71, 66).
    const mat = new MeshPhysicalMaterial({ color: mix('--ink', '--peach-glow', 0.065), roughness: 0.7, metalness: 0, sheen: 0.2, sheenRoughness: 0.6, envMapIntensity: 0.5 });
    mat.sheenColor.set(token('--peach-glow'));
    const mesh = new Mesh(seedGeometry(), mat);
    const holder = new Group();
    holder.add(mesh);
    return { holder, mesh, mat };
  }, []);

  // Soft studio light from all round, so leaves and bark pick up real highlights.
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.4;
    invalidate();
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, invalidate]);

  // Scrolling asks for a frame; while Act 1 is on screen the sway keeps asking.
  const asleep = useRef(false); // Act 1 and the word's exit are over and the last state is applied: draw nothing
  useEffect(() => {
    // Every draw is a full-screen canvas for the compositor: once the plant is gone, scrolling further down
    // the page must not wake this scene (it made the weave film stutter). It wakes when the hero is back.
    const ask = () => {
      if (asleep.current && (document.getElementById('hero')?.getBoundingClientRect().bottom ?? 0) < window.innerHeight * 0.4) return;
      asleep.current = false;
      invalidate();
    };
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    return () => {
      window.removeEventListener('scroll', ask);
      window.removeEventListener('resize', ask);
    };
  }, [invalidate]);

  useEffect(
    () => () => {
      if (tree.current) disposeTree(tree.current.t);
      delete document.documentElement.dataset.vineReady;
      seed.mat.dispose();
      seed.mesh.geometry.dispose();
    },
    [seed],
  );

  useFrame(() => {
    const g = root.current;
    const hero = document.getElementById('hero');
    const wordEl = document.querySelector('[data-hero-word]');
    const word = wordEl?.getBoundingClientRect();
    const stage = document.querySelector<HTMLElement>('[data-film="seed"]');
    const ds = stage?.dataset;
    if (!g || !hero || !word || !stage || !ds?.set || !ds.size || !ds.focus || !SEED_AT[ds.set]) {
      if (g) g.visible = false;
      return;
    }

    const target = act1(hero.getBoundingClientRect().top, window.innerHeight);
    shown.current = shown.current === null ? target : approach(shown.current, target);
    const st = stages(shown.current);
    // The plant belongs to the word: after Act 1 it stays, and shrinks away and fades with the word as
    // the film follows the seed down to the soil (the word's box and opacity are read every frame, and
    // the plant is laid out in that box). The page never returns to a bare logo.
    const wordOpacity = wordEl ? parseFloat(getComputedStyle(wordEl).opacity) : 0;
    // The cover (VineStage paints it: the film's backdrop, hiding the film's seed) fades at the handoff.
    const cover = document.querySelector<HTMLElement>('#hero .vine-cover');
    if (cover) cover.style.opacity = String(1 - st.fade);
    gl.domElement.style.opacity = String(wordOpacity);
    g.visible = wordOpacity > 0.01;
    // Still easing toward the scroll (a fast scroll can leave the word gone before the cover has faded):
    // keep drawing until it has caught up, or the cover would be left over the film.
    if (shown.current !== target) invalidate();
    gl.domElement.style.visibility = g.visible ? 'visible' : 'hidden'; // no layer to composite while there is nothing on it
    if (!g.visible) {
      asleep.current = shown.current === target && target >= 1;
      return;
    }
    // The first time it is seen, the vine sprouts in by itself over a second and a half: something is
    // alive on the first screen before the reader has scrolled at all.
    const now = clock.getElapsedTime();
    born.current ??= now;
    st.vine *= sstep((now - born.current) / 1.5, 0, 1);

    // Screen px to world, against this canvas's own box.
    const c = gl.domElement.getBoundingClientRect();
    const h = 2 * Math.tan((FOV * Math.PI) / 360) * DIST;
    const px = h / size.height;
    const toWorld = (x: number, y: number) => v3((x - c.left - c.width / 2) * px, -(y - c.top - c.height / 2) * px);

    // The film's set and how it covers its stage: where its frame lands, and its seed with it.
    const [fw, fh] = ds.size.split(',').map(Number);
    const [fx, fy] = ds.focus.split(',').map(Number);
    const box = stage.getBoundingClientRect();
    const k = Math.max(box.width / fw, box.height / fh);
    const dw = fw * k;
    const dh = fh * k;
    const left = box.left + (box.width - dw) * fx;
    const top = box.top + (box.height - dh) * fy;
    const mark = SEED_AT[ds.set];

    // The plant, in word units: rebuilt only when the letters or the seed mark move.
    const wu = word.height;
    const mx = (left + mark.at[0] * dw - word.left) / wu;
    const my = -(top + mark.at[1] * dh - word.top) / wu;
    // Each letter's own box, so the vine fits the real G, I, E and O at any size.
    const text = wordEl?.firstChild;
    const letters: [number, number][] = [];
    if (text?.nodeType === Node.TEXT_NODE) {
      const range = document.createRange();
      for (let i = 0; i < (text.textContent ?? '').length; i++) {
        range.setStart(text, i);
        range.setEnd(text, i + 1);
        const r = range.getBoundingClientRect();
        if (r.width > 1) letters.push([(r.left - word.left) / wu, (r.right - word.left) / wu]);
      }
    }
    if (!letters.length) letters.push([0, word.width / wu]);
    const key = `${letters.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(';')}:${mx.toFixed(2)}:${my.toFixed(2)}`;
    // Rebuilt only during Act 1: after it the word shrinks, and the seed mark (which no longer matters)
    // moves against it; the plant must stay as it was grown.
    if (!tree.current || (target < 1 && tree.current.key !== key)) {
      if (tree.current) {
        g.remove(tree.current.t.group);
        disposeTree(tree.current.t);
      }
      tree.current = { key, t: buildTree(letters, mx, my) };
      tree.current.t.group.add(seed.holder);
      g.add(tree.current.t.group);
      if (!document.documentElement.dataset.vineReady) {
        document.documentElement.dataset.vineReady = '1'; // VineStage's loading bar finishes on this
        window.dispatchEvent(new Event('gieo:vine'));
      }
    }
    const t = tree.current.t;
    t.group.position.copy(toWorld(word.left, word.top));
    t.group.scale.setScalar(wu * px);
    const time = clock.getElapsedTime();
    t.group.rotation.z = 0.005 * Math.sin(time * 0.7);

    t.tubes.forEach((tb) => {
      const u = tb.mat.userData.u as TubeUniforms;
      u.uGrow.value = tb.grow(st);
      u.uThick.value = tb.thick(st);
      tb.mesh.visible = u.uGrow.value > 0.001;
    });
    const buds = (list: Bud[], mesh: InstancedMesh, sway: number) => {
      list.forEach((b, i) => {
        dummy.position.copy(b.p);
        dummy.rotation.set(b.rot[0] + sway * 0.6 * Math.sin(time * 0.9 + i * 1.7), b.rot[1], b.rot[2] + sway * Math.sin(time * 1.3 + i));
        dummy.scale.setScalar(b.pop(st, t.tubes) * b.size);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    buds(t.leaves, t.leafMesh, 0.12);
    buds(t.blossoms, t.blossomMesh, 0.06);

    // The seed: swells under the crown, lets go, falls along an arc and grows onto the film seed's mark,
    // upright and at the film seed's size. It stays whole while the backdrop fades, so the two overlap.
    const full = (mark.h * dh) / wu; // the film seed's height, in word units (the geometry is 1 tall)
    const holder = seed.holder;
    holder.visible = st.swell > 0.001 && st.fade < 1; // after the handoff the film's own seed is the seed
    if (holder.visible) {
      // On the branch it is sized to the tree (0.2 of the word's height at most), not to the film: on a
      // phone the film's seed is far larger than the whole tree. It grows to the film's size as it falls.
      const small = Math.min(0.42, 0.2 / full);
      const scale = full * (st.fall > 0 ? small + (1 - small) * st.fall : small * st.swell);
      const from: [number, number] = [t.hang.x, t.hang.y - (full * small) / 2];
      const [sx, sy] = fallPoint(from, [t.mark.x, t.mark.y], st.fall);
      const tumble = Math.sin(Math.PI * st.fall); // 0 on the branch and on the mark: it lands upright
      holder.position.set(sx, sy + (st.fall === 0 ? 0.006 * Math.sin(time * 1.4) : 0), 0.25);
      holder.scale.setScalar(scale);
      holder.rotation.set(0.2 * tumble, 1.2 * tumble, 0.3 * tumble);
    }

    invalidate(); // the sway, and the easing toward the scroll, keep going while Act 1 is on screen
  });

  return <group ref={root} />;
}

function Lights() {
  const [cream, petal] = useMemo(() => [token('--cream'), token('--petal-soft')], []);
  return (
    <>
      <hemisphereLight args={[cream, petal, 0.9]} />
      <directionalLight position={[-3, 5, 4]} color={cream} intensity={1.8} />
      <directionalLight position={[3, 1, -3]} color={petal} intensity={0.7} />
    </>
  );
}

// A context can fail; the hero keeps its film and its word.
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function VineCanvas() {
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
        <Lights />
        <Vine />
      </Canvas>
    </Boundary>
  );
}
