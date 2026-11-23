'use client';

import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  ClampToEdgeWrapping,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PMREMGenerator,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  type Material,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { focus, hover, momentum, PRODUCT_KEYS, productPose, slotOffset, wrap, type ProductKey } from '@/lib/showroom';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { makeBody, makeBrocade, token } from './weave-materials';

/**
 * The Collections gallery (src/lib/showroom.ts has the math). GIEO's two products from the weave models
 * (blender/scripts/weave.py, after GIEO's photos), the Nối Bag and the Nếp Keychain, each hang in their box
 * ([data-showroom-stage="<key>"], which the track slides left): turning, bobbing over a soft shadow, in a
 * petal glow; each rises in from the lower right and leaves toward the upper left, leaning into the scroll
 * and turning faster the faster the reader scrolls. While it is in the middle its parts keep a life of their
 * own: the bag's strap sways on its band, the holder's clasp swings (and swings further when the scroll
 * pushes it). The holder is small in life but hangs here as large as the bag, and rocks rather than spins:
 * edge-on it would read as a sliver. Flower petals drift through the pin at many depths, the near ones
 * passing faster than the products.
 * frameloop is "demand": while the section is on screen the scene asks for the next frame; off screen it
 * draws nothing and asks for nothing.
 */

const FOV = 35;
const DIST = 10;
const GLB = '/models/weave.glb';
const CLOTH = '/models/weave-cloth.webp';
// Each product's size in its box (box units: one is the box's shorter side), so the two read alike: the
// holder, a few centimetres in life, hangs as large as the bag: it is the hero of its slot.
const SIZE: Record<ProductKey, number> = { bag: 1.06, lipstick: 0.93 };
// The model height (weave.py units) hung at the box's centre, so each sits in the middle of its box; where
// its shadow lies (its foot, a little below); its phase in the float.
const CENTRE: Record<ProductKey, number> = { bag: 0.1, lipstick: 0.04 };
const FLOOR: Record<ProductKey, number> = { bag: -0.32, lipstick: -0.48 };
const PHASE: Record<ProductKey, number> = { bag: 0, lipstick: 2.6 };
const MOTES = 46;

useLoader.preload(GLTFLoader, GLB, (l) => l.setMeshoptDecoder(MeshoptDecoder));
useLoader.preload(TextureLoader, CLOTH);

const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

// A soft radial: the petal glow behind each product, and (squashed, in ink) its shadow below.
const RADIAL_FRAG = /* glsl */ `
varying vec2 vUv;
uniform float uOpacity, uStrength;
uniform vec3 uColor;
void main() {
  float d = length(vUv - .5) * 2.;
  gl_FragColor = vec4(uColor, pow(1. - smoothstep(0., 1., d), 2.) * uStrength * uOpacity);
  #include <colorspace_fragment>
}`;

function radial(color: string, strength: number, w: number, h: number) {
  const mat = new ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: RADIAL_FRAG,
    transparent: true,
    depthWrite: false,
    uniforms: { uOpacity: { value: 1 }, uStrength: { value: strength }, uColor: { value: new Color(color) } },
  });
  return new Mesh(new PlaneGeometry(w, h), mat);
}

const part = (root: Object3D, name: string) => root.getObjectByName(name) as Object3D;

type Product = {
  holder: Group; // placed at its box, scaled to it
  float: Group; // the hover and the lean
  turn: Object3D; // the model's own Turn node
  glow: Mesh;
  shadow: Mesh;
  mats: Material[];
};

/** A fixed scatter (seeded, so every visit and every screenshot is the same). */
function scatter(n: number) {
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  return Array.from({ length: n }, () => ({
    x: rnd() * 2 - 1,
    y: rnd() * 2 - 1,
    z: -3 + rnd() * 4.6,
    size: 0.1 + rnd() * 0.13,
    rx: rnd() * Math.PI,
    ry: rnd() * Math.PI,
    spin: (rnd() - 0.5) * 1.2,
    drift: 0.03 + rnd() * 0.05,
    hue: rnd(),
  }));
}

export default function ShowroomScene() {
  const gltf = useLoader(GLTFLoader, GLB, (l) => l.setMeshoptDecoder(MeshoptDecoder));
  const cloth = useLoader(TextureLoader, CLOTH);
  const { gl, scene, camera, size, invalidate, clock } = useThree();
  const place = useRef<Group>(null);
  const ready = useRef(false);
  const motion = useRef({ lastLeft: Number.NaN, vel: 0, boost: 0 });
  const dummy = useMemo(() => new Object3D(), []);

  const rig = useMemo(() => {
    // A clone: the cached glTF scene is WeaveScene's, and its stations would move our products.
    const root = gltf.scene.clone(true);
    cloth.flipY = false; // glTF UV origin
    cloth.colorSpace = SRGBColorSpace;
    cloth.anisotropy = 4;
    cloth.wrapS = cloth.wrapT = ClampToEdgeWrapping;

    // Lifts sit well under 1: the studio light adds to the canvas's own lights, and at 1 every surface clips.
    // The brocade's UVs are in cloth units (weave.py: a diamond on the bag, a larger unit on the holder, whose
    // front shows a few more, smaller diamonds as in GIEO's photos); `yarns` is per unit.
    const mats = {
      brocade: makeBrocade(cloth, 12, 0.74, { lattice: 1, shade: true }),
      front: makeBrocade(cloth, 15, 0.74, { lattice: 1.25, shade: true }),
      bag: makeBody([0.7, 0.86, 0.86], 'canvas', 260),
      lip: makeBody([0.7, 0.86, 0.86], 'canvas', 260),
      wood: new MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, transparent: true }),
      brass: new MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.9, envMapIntensity: 3, transparent: true }),
    };
    mats.wood.color.setRGB(0.95, 0.86, 0.8);
    mats.brass.color.setRGB(1, 0.78, 0.46); // the soft brass: the peach in the model, warmed
    const assign: Record<string, [Material, number]> = {
      NoiBody: [mats.bag, 0],
      NoiBand: [mats.brocade, 1],
      NoiHandle: [mats.brocade, 1],
      LipBody: [mats.lip, 0],
      LipFlap: [mats.lip, 0],
      LipLoop: [mats.lip, 0],
      LipFront: [mats.front, 1],
      LipButton: [mats.wood, 0],
      LipClasp: [mats.brass, 0],
    };
    root.traverse((o) => {
      const hit = assign[o.name];
      if (!hit || !(o as Mesh).isMesh) return;
      [(o as Mesh).material, (o as Mesh).renderOrder] = hit;
    });

    // The parts that move on their own, found while they are still under root.
    const parts = {
      handle: part(root, 'NoiHandlePivot'),
      clasp: part(root, 'LipClaspPivot'),
    };

    const byKey: Record<ProductKey, Material[]> = {
      bag: [mats.brocade, mats.bag],
      lipstick: [mats.front, mats.lip, mats.wood, mats.brass],
    };
    const products = {} as Record<ProductKey, Product>;
    for (const key of PRODUCT_KEYS) {
      const turn = root.getObjectByName(`Turn${key[0].toUpperCase()}${key.slice(1)}`) as Object3D;
      const holder = new Group();
      const float = new Group();
      const glow = radial(token('--petal-soft'), 0.26, 1.7, 1.7);
      glow.position.z = -0.6;
      glow.renderOrder = -2;
      const shadow = radial(token('--ink'), 0.55, key === 'bag' ? 0.8 : 0.5, key === 'bag' ? 0.8 : 0.5);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = FLOOR[key] - CENTRE[key];
      shadow.renderOrder = -1;
      float.add(turn); // re-parenting drops the home carousel's station transform
      turn.position.set(0, -CENTRE[key], 0);
      holder.add(glow, shadow, float);
      products[key] = { holder, float, turn, glow, shadow, mats: byKey[key] };
    }

    // Flower petals adrift (the site's recurring theme): cupped, pointed at the tip, pinks and cream.
    const petalGeo = new PlaneGeometry(1, 1, 6, 4);
    {
      const pos = petalGeo.getAttribute('position');
      const uv = petalGeo.getAttribute('uv');
      for (let i = 0; i < pos.count; i++) {
        const u = uv.getX(i);
        const half = 0.34 * Math.pow(Math.sin(Math.PI * Math.pow(u, 1.2)), 0.6);
        const y = 2 * (uv.getY(i) - 0.5) * half;
        pos.setXYZ(i, u - 0.5, y, 0.5 * Math.abs(y) + 0.3 * (u - 0.5) * (u - 0.5));
      }
      petalGeo.computeVertexNormals();
    }
    const moteMat = new MeshStandardMaterial({ roughness: 0.55, metalness: 0, transparent: true, side: DoubleSide });
    const motes = new InstancedMesh(petalGeo, moteMat, MOTES);
    motes.frustumCulled = false;
    const seeds = scatter(MOTES);
    const palette = [token('--petal-soft'), token('--lotus-pink'), token('--cream')].map((c) => new Color(c));
    seeds.forEach((m, i) => motes.setColorAt(i, palette[m.hue < 0.5 ? 0 : m.hue < 0.78 ? 1 : 2]));

    return { mats, parts, products, motes, moteMat, seeds };
  }, [gltf, cloth]);

  // Compile with everything visible once, off the scroll path, then let the page hide its pictures.
  useEffect(() => {
    const p = place.current!;
    p.visible = true;
    let live = true;
    void gl.compileAsync(scene, camera).then(() => {
      if (!live) return;
      gl.initTexture(cloth);
      ready.current = true;
      document.documentElement.dataset.showroom = 'ready';
      invalidate();
    });
    p.visible = false;
    return () => {
      live = false;
      ready.current = false;
      delete document.documentElement.dataset.showroom;
    };
  }, [gl, scene, camera, cloth, invalidate, rig]);

  // Soft studio light from all round while this scene is up: fabric and glaze need something to reflect.
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.32;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  // Scrolling brings the section back on screen: ask for a frame (the float keeps asking while it is there).
  useEffect(() => {
    const ask = () => invalidate();
    window.addEventListener('scroll', ask, { passive: true });
    window.addEventListener('resize', ask);
    return () => {
      window.removeEventListener('scroll', ask);
      window.removeEventListener('resize', ask);
    };
  }, [invalidate]);

  useEffect(
    () => () => {
      Object.values(rig.mats).forEach((m) => m.dispose());
      Object.values(rig.products).forEach(({ glow, shadow }) => {
        [glow, shadow].forEach((m) => {
          (m.material as Material).dispose();
          m.geometry.dispose();
        });
      });
      rig.moteMat.dispose();
      rig.motes.geometry.dispose();
      rig.motes.dispose();
    },
    [rig],
  );

  useFrame(() => {
    const p = place.current;
    if (!p) return;
    const pin = document.querySelector('.showroom-pin')?.getBoundingClientRect();
    // How much of the screen the pinned run covers: 1 while pinned, falling to 0 as it scrolls away.
    const cover = pin ? Math.max(0, Math.min(pin.bottom, size.height) - Math.max(pin.top, 0)) / size.height : 0;
    p.visible = ready.current && cover > 0.002;
    if (!p.visible || !pin) return;

    const h = 2 * Math.tan((FOV * Math.PI) / 360) * DIST; // world height of the screen on the z = 0 plane
    const w = h * (size.width / size.height);
    const px = h / size.height; // one CSS px in world units
    const toWorld = (x: number, y: number) => [(x / size.width - 0.5) * w, -(y / size.height - 0.5) * h];
    const t = clock.getElapsedTime();

    // Scroll momentum from how far the row moved since the last frame, eased so it swells and settles.
    const lead = document.querySelector(`[data-showroom-stage="${PRODUCT_KEYS[0]}"]`)?.getBoundingClientRect();
    const m = motion.current;
    const dx = lead && !Number.isNaN(m.lastLeft) ? lead.left - m.lastLeft : 0;
    m.lastLeft = lead ? lead.left : Number.NaN;
    m.vel += (momentum(dx, size.width) - m.vel) * 0.12;
    m.boost += m.vel * 0.07;

    for (const key of PRODUCT_KEYS) {
      const { holder, float, turn, glow, shadow, mats } = rig.products[key];
      const r = document.querySelector(`[data-showroom-stage="${key}"]`)?.getBoundingClientRect();
      const d = r ? slotOffset(r.left, r.width, size.width) : 9;
      const pose = productPose(d);
      holder.visible = !!r && pose.opacity > 0.003 && r.right > -r.width * 0.3 && r.left < size.width * 1.1;
      if (!holder.visible || !r) continue;

      const [x, y] = toWorld(r.left + r.width / 2, r.top + r.height / 2);
      const unit = Math.min(r.width, r.height) * px;
      holder.position.set(x, y + pose.y * unit, pose.z * unit);
      holder.scale.setScalar(unit * SIZE[key] * pose.scale);

      // Suspended: a bob and sway, a slow spin of its own, plus the turn the travel gives it and the
      // momentum's extra; it leans into the direction of travel.
      const f = hover(t, PHASE[key]);
      float.position.y = f.y;
      float.rotation.set(0.12 * m.vel, 0, f.tilt - 0.22 * m.vel);
      const yaw = pose.yaw + f.spin + m.boost;
      // The flat holder rocks round a three-quarter view; the bag turns all the way round.
      if (key === 'lipstick') turn.rotation.set(0.04, -0.2 + 0.62 * Math.sin(yaw + 0.3), 0);
      else turn.rotation.set(0.06, yaw, 0);

      // Its parts' own life, strongest in the middle: the strap sways forward and back on its band; the clasp
      // swings like a pendulum, pushed further by the scroll.
      const live = focus(d);
      if (key === 'bag') rig.parts.handle.rotation.x = 0.16 * Math.sin(t * 1.5) * live;
      else {
        const clasp = rig.parts.clasp;
        clasp.rotation.z = (0.16 * Math.sin(t * 1.9) + 0.35 * m.vel) * live;
        clasp.rotation.x = 0.12 * Math.sin(t * 1.3 + 0.5) * live;
      }

      // The shadow tightens as it bobs down, spreads and pales as it rises.
      shadow.scale.setScalar(1 - 3 * f.y);
      (shadow.material as ShaderMaterial).uniforms.uOpacity.value = pose.opacity * (1 - 6 * f.y);
      (glow.material as ShaderMaterial).uniforms.uOpacity.value = pose.opacity;
      mats.forEach((mat) => {
        mat.opacity = pose.opacity;
        mat.transparent = pose.opacity < 0.999; // blended only while fading, or the back handle shows through
      });
    }

    // Loose yarn across the pinned screen: it travels with the row at its own depth's pace, drifts and turns.
    const travel = (lead ? lead.left : 0) * px;
    const centreY = toWorld(0, pin.top + pin.height / 2)[1];
    const half = w * 0.65;
    rig.moteMat.opacity = Math.min(1, cover * 1.4) * 0.9;
    rig.seeds.forEach((s, i) => {
      const pace = 0.35 + ((s.z + 3) / 4.6) * 1.0; // far 0.35, near 1.35 of the row's speed
      dummy.position.set(
        wrap(s.x * half + travel * pace - t * s.drift, -half, half),
        centreY + s.y * h * 0.46 + 0.08 * Math.sin(t * 0.6 + i),
        s.z,
      );
      dummy.rotation.set(s.rx + t * s.spin, s.ry + t * s.spin * 0.7, 0);
      dummy.scale.setScalar(s.size * (h / 6.3));
      dummy.updateMatrix();
      rig.motes.setMatrixAt(i, dummy.matrix);
    });
    rig.motes.instanceMatrix.needsUpdate = true;

    invalidate();
  });

  return (
    <group ref={place} visible={false}>
      <primitive object={rig.motes} />
      {PRODUCT_KEYS.map((key) => (
        <primitive key={key} object={rig.products[key].holder} />
      ))}
    </group>
  );
}
