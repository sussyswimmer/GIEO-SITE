import {
  Color,
  FrontSide,
  MeshPhysicalMaterial,
  type IUniform,
  type Material,
  type Mesh,
  type Texture,
  type WebGLProgramParametersWithUniforms,
} from 'three';

/**
 * The weave models' materials (public/models/weave.glb), shared by WeaveScene (the home page's live
 * fallback, unmounted since the redesign) and ShowroomScene (Collections). The lift multipliers invert
 * SceneCanvas's shared lights at each surface's hero normal, so the colours stay the brand's.
 */

export const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export const HEAD_TINT = 0.55;

export type ClothUniforms = Record<'uYarns' | 'uYarn' | 'uRows' | 'uReveal' | 'uHeadCol' | 'uHeadAmt', IUniform>;

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

export function makeCloth(map: Texture, yarns: number, yarn: number, lift: [number, number, number], headCol: Color): MeshPhysicalMaterial {
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

export type BrocadeUniforms = Record<'uYarns' | 'uWarp' | 'uWeft' | 'uMint' | 'uStitch', IUniform>;

// The showroom's cloth: the same plain weave, coloured in the shader (cream warp, petal weft, one mint
// running stitch at uStitch across), lit by the scene. No motif: GIEO has not given one.
function brocadeCompile(this: Material, shader: WebGLProgramParametersWithUniforms) {
  Object.assign(shader.uniforms, (this.userData as { u: BrocadeUniforms }).u);
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
uniform float uYarns, uStitch;
uniform vec3 uWarp, uWeft, uMint;`,
    )
    .replace(
      '#include <map_fragment>',
      `vec2 c = vMapUv * uYarns, id = floor(c), f = fract(c);
float over = mod(id.x + id.y, 2.);
float prof = over < .5 ? sin(PI * f.x) : sin(PI * f.y);
float stitch = 1. - step(.5, abs(id.x - floor(uYarns * uStitch)));
vec3 yarn = over < .5 ? mix(uWarp, uMint, stitch) : uWeft;
vec3 avg = mix(mix(uWarp, uWeft, .55), uMint, .5 * stitch);
float aa = smoothstep(.14, .32, max(fwidth(c.x), fwidth(c.y)));
diffuseColor.rgb *= mix(yarn * (.78 + .3 * prof), avg * .93, aa);
float e = min(min(vMapUv.x, 1. - vMapUv.x), min(vMapUv.y, 1. - vMapUv.y));
diffuseColor.a *= smoothstep(0., 1.5 * fwidth(e), e);`,
    );
}

/** A woven cloth surface for the showroom: needs the mesh's UVs (a map is set only so three.js provides them). */
export function makeBrocade(map: Texture, yarns: number, lift: number, stitch = 0.72): MeshPhysicalMaterial {
  const m = new MeshPhysicalMaterial({ map, roughness: 0.92, metalness: 0, sheen: 0.6, sheenRoughness: 0.5, side: FrontSide });
  m.sheenColor.set(token('--petal-soft'));
  m.color.setScalar(lift);
  m.userData.u = {
    uYarns: { value: yarns },
    uWarp: { value: new Color(token('--cream')) },
    uWeft: { value: new Color(token('--petal-soft')) },
    uMint: { value: new Color(token('--stem-mint')) },
    uStitch: { value: stitch },
  } satisfies BrocadeUniforms;
  m.onBeforeCompile = brocadeCompile;
  return m;
}

// A woven canvas grain for the bodies that are cloth: a fine cross-hatch from the model's own coordinates
// (the bodies carry no UVs), a soft unevenness over it. Read in the object's space, so it turns with it.
function canvasCompile(shader: WebGLProgramParametersWithUniforms) {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\nvarying vec3 vObj;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\nvObj = position;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nvarying vec3 vObj;`)
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
vec3 q = vObj * 150.;
float warp = .5 + .5 * sin(q.x + q.z);
float weft = .5 + .5 * sin(q.y);
float grain = mix(warp, weft, step(.5, fract((floor(q.x / 3.1416) + floor(q.y / 3.1416)) * .5) * 2.));
float soft = .5 + .5 * sin(vObj.x * 9. + sin(vObj.y * 7.) * 2.);
diffuseColor.rgb *= (.9 + .13 * grain) * (.96 + .06 * soft);`,
    );
}

/**
 * The products' bodies: vertex colours from Blender. `canvas` is cloth (a woven grain, matte, a soft
 * sheen); `ceramic` is glazed (smooth, a clear coat that catches the light); the default is the plain clay.
 */
export function makeBody(lift: [number, number, number] = [1.1, 1.43, 1.39], kind?: 'canvas' | 'ceramic'): MeshPhysicalMaterial {
  const m = new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: kind === 'ceramic' ? 0.22 : kind === 'canvas' ? 0.95 : 0.8,
    metalness: 0,
    sheen: kind === 'ceramic' ? 0 : 1,
    sheenRoughness: kind === 'canvas' ? 0.7 : 0.45,
    sheenColor: new Color(token('--peach-glow')),
    clearcoat: kind === 'ceramic' ? 0.7 : 0,
    clearcoatRoughness: 0.18,
    transparent: true,
    side: FrontSide,
  });
  m.color.setRGB(...lift);
  if (kind === 'canvas') {
    m.onBeforeCompile = canvasCompile;
    m.customProgramCacheKey = () => 'body-canvas';
  }
  return m;
}

/** The tote panel's drape: eight hand-weighted keys, 0 the flat cloth, 1 wrapped on the bag. */
export function setDrape(mesh: Mesh | null, d: number) {
  const inf = mesh?.morphTargetInfluences;
  if (!inf) return;
  inf.fill(0);
  const x = d * inf.length;
  const a = Math.min(Math.floor(x), inf.length);
  const f = x - a;
  if (a >= 1) inf[a - 1] = 1 - f;
  if (a < inf.length) inf[a] = f;
}
