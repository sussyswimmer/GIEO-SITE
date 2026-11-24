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

// The plain weave, coloured in the shader (cream warp, petal weft, one mint running stitch at uStitch across),
// lit by the scene; no motif. The showroom's products use the lattice below instead.
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

export type LatticeUniforms = Record<'uYarns' | 'uLattice' | 'uGround' | 'uFigure', IUniform>;

// The brocade of GIEO's products (their photos): a small diamond lattice in two tones, each diamond an outline
// with a dot at its heart. Up close it is drawn yarn by yarn (each yarn one colour, as woven, so the diagonals
// step); once the yarns are under a few pixels it is drawn smooth, and once the diamonds are too it settles to
// the cloth's average colour, so it never shimmers. UVs are in cloth units (weave.py: one diamond per unit),
// and needn't stay inside 0..1, so there is no edge fade here.
function latticeCompile(this: Material, shader: WebGLProgramParametersWithUniforms) {
  Object.assign(shader.uniforms, (this.userData as { u: LatticeUniforms }).u);
  shader.fragmentShader = shader.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>
uniform float uYarns, uLattice;
uniform vec3 uGround, uFigure;`,
    )
    .replace(
      '#include <map_fragment>',
      `vec2 c = vMapUv * uYarns, id = floor(c), f = fract(c);
float over = mod(id.x + id.y, 2.);
float prof = over < .5 ? sin(PI * f.x) : sin(PI * f.y);
float aa = smoothstep(.14, .32, max(fwidth(c.x), fwidth(c.y)));
vec2 g = vMapUv * uLattice;
float fw = max(fwidth(g.x), fwidth(g.y));
vec2 q = abs(fract(mix((id + .5) / uYarns * uLattice, g, aa)) - .5);
float d = q.x + q.y;
float soft = aa * fw + 1e-4;
float fig = max(1. - smoothstep(.075 - soft, .075 + soft, abs(d - .5)), 1. - smoothstep(.1 - soft, .1 + soft, d));
fig = mix(fig, .3, smoothstep(.12, .3, fw));
vec3 col = mix(uGround, uFigure, fig);
diffuseColor.rgb *= mix(col * (.8 + .28 * prof), col * .95, aa);`,
    );
}

type BrocadeOptions = {
  /** The plain weave's one mint running stitch, as a fraction across (the default look). */
  stitch?: number;
  /** Diamonds per UV unit: draws GIEO's two-tone diamond lattice instead of the plain weave. */
  lattice?: number;
  /** The lattice's two tones (linear colours); default a rose ground and a cream figure. */
  ground?: Color;
  figure?: Color;
  /** Multiply by the mesh's vertex colours (the shade baked in Blender). */
  shade?: boolean;
};

/** A woven cloth surface for the showroom: needs the mesh's UVs (a map is set only so three.js provides them). */
export function makeBrocade(map: Texture, yarns: number, lift: number, opts: BrocadeOptions = {}): MeshPhysicalMaterial {
  const m = new MeshPhysicalMaterial({
    map,
    vertexColors: !!opts.shade,
    roughness: 0.92,
    metalness: 0,
    sheen: 0.6,
    sheenRoughness: 0.5,
    side: FrontSide,
  });
  m.sheenColor.set(token('--petal-soft'));
  m.color.setScalar(lift);
  if (opts.lattice) {
    m.userData.u = {
      uYarns: { value: yarns },
      uLattice: { value: opts.lattice },
      uGround: { value: opts.ground ?? new Color(token('--lotus-pink')).lerp(new Color(token('--petal-soft')), 0.4) },
      uFigure: { value: opts.figure ?? new Color(token('--cream')) },
    } satisfies LatticeUniforms;
    m.onBeforeCompile = latticeCompile;
    return m;
  }
  m.userData.u = {
    uYarns: { value: yarns },
    uWarp: { value: new Color(token('--cream')) },
    uWeft: { value: new Color(token('--petal-soft')) },
    uMint: { value: new Color(token('--stem-mint')) },
    uStitch: { value: opts.stitch ?? 0.72 },
  } satisfies BrocadeUniforms;
  m.onBeforeCompile = brocadeCompile;
  return m;
}

// A woven canvas grain for the bodies that are cloth: a fine cross-hatch from the model's own coordinates
// (the bodies carry no UVs), a soft unevenness over it. Read in the object's space, so it turns with it.
// uGrain sets its fineness (the meshes are quantised, so object units differ a little from mesh to mesh).
function canvasCompile(this: Material, shader: WebGLProgramParametersWithUniforms) {
  shader.uniforms.uGrain = (this.userData as { grain: IUniform }).grain;
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\nvarying vec3 vObj;`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\nvObj = position;`);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\nvarying vec3 vObj;\nuniform float uGrain;`)
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
vec3 q = vObj * uGrain;
float warp = .5 + .5 * sin(q.x + q.z);
float weft = .5 + .5 * sin(q.y);
float grain = mix(warp, weft, step(.5, fract((floor(q.x / 3.1416) + floor(q.y / 3.1416)) * .5) * 2.));
float soft = .5 + .5 * sin(vObj.x * 9. + sin(vObj.y * 7.) * 2.);
diffuseColor.rgb *= (.9 + .13 * grain) * (.96 + .06 * soft);`,
    );
}

/**
 * The products' bodies: vertex colours from Blender. `canvas` is cloth (a woven grain, matte, a soft
 * sheen); the default is the plain clay.
 */
export function makeBody(
  lift: [number, number, number] = [1.1, 1.43, 1.39],
  kind?: 'canvas',
  grain = 150,
): MeshPhysicalMaterial {
  const m = new MeshPhysicalMaterial({
    vertexColors: true,
    roughness: kind === 'canvas' ? 0.95 : 0.8,
    metalness: 0,
    sheen: 1,
    sheenRoughness: kind === 'canvas' ? 0.7 : 0.45,
    sheenColor: new Color(token('--peach-glow')),
    transparent: true,
    side: FrontSide,
  });
  m.color.setRGB(...lift);
  if (kind === 'canvas') {
    m.userData.grain = { value: grain };
    m.onBeforeCompile = canvasCompile;
    m.customProgramCacheKey = () => 'body-canvas';
  }
  return m;
}

/** The panel's drape (legacy WeaveScene): eight hand-weighted keys, 0 the flat cloth, 1 settled in front of the bag. */
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
