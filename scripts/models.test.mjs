import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

function load(name) {
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models', `${name}.glb`);
  const buf = readFileSync(file);
  assert.equal(buf.readUInt32LE(0), 0x46546c67, 'glTF magic');
  const jsonLen = buf.readUInt32LE(12);
  assert.equal(buf.readUInt32LE(16), 0x4e4f534a, 'first chunk is JSON');
  return { file, gltf: JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8')) };
}

const { file, gltf } = load('lotus');
const nodes = gltf.nodes;

test('size budget', () => {
  assert.ok(statSync(file).size <= 400 * 1024);
});

test('named nodes exist', () => {
  for (const n of ['Lotus', 'Stem', 'Receptacle', 'Pod', 'Seed']) {
    assert.ok(nodes.some((x) => x.name === n), n);
  }
});

test('17 pivots with one child, open > 0 and order 1/2/3/4', () => {
  const pivots = nodes.filter((n) => /^Pivot_/.test(n.name));
  assert.equal(pivots.length, 17);
  for (const p of pivots) {
    assert.equal(p.children?.length, 1, p.name);
    assert.ok(p.extras.open > 0, p.name);
  }
  const orders = pivots.map((p) => p.extras.order);
  for (const o of [1, 2, 3]) assert.equal(orders.filter((x) => x === o).length, 1, `order ${o}`);
  assert.ok(orders.filter((x) => ![1, 2, 3].includes(x)).every((x) => x === 4));
});

test('every primitive has COLOR_0', () => {
  for (const m of gltf.meshes) for (const p of m.primitives) assert.ok('COLOR_0' in p.attributes, m.name);
});

test('meshopt compression used', () => {
  assert.ok(gltf.extensionsUsed.includes('EXT_meshopt_compression'));
});

// ---- seed (animation 1) ----
const seed = load('seed');
const sn = seed.gltf.nodes;
const nodeIdx = (name) => sn.findIndex((x) => x.name === name);
const channels = seed.gltf.animations?.[0]?.channels ?? [];
const has = (name, path) => channels.some((c) => c.target.node === nodeIdx(name) && c.target.path === path);
const targets = (name) => seed.gltf.meshes[sn[nodeIdx(name)].mesh].primitives[0].targets?.length ?? 0;

test('seed: size budget', () => {
  assert.ok(statSync(seed.file).size <= 600 * 1024);
});

test('seed: triangle budget', () => {
  let tris = 0;
  for (const m of seed.gltf.meshes) {
    for (const p of m.primitives) {
      tris += (p.indices !== undefined ? seed.gltf.accessors[p.indices].count : seed.gltf.accessors[p.attributes.POSITION].count) / 3;
    }
  }
  assert.ok(tris <= 25000, `${tris} triangles`);
});

test('seed: contract nodes exist', () => {
  const names = ['SeedScene', 'Mound', 'SeedRoot', 'Hinge_L', 'Hinge_R', 'Half_L', 'Half_R', 'Stem', 'Thread',
    'LeafPivot_A', 'LeafPivot_B', 'Leaf_A', 'Leaf_B'];
  for (const n of names) assert.ok(nodeIdx(n) >= 0, n);
  for (const n of ['Mound', 'Half_L', 'Half_R', 'Stem', 'Thread', 'Leaf_A', 'Leaf_B']) assert.ok(sn[nodeIdx(n)].mesh !== undefined, `${n} is a mesh`);
});

test('seed: one animation named Sprout', () => {
  assert.equal(seed.gltf.animations.length, 1);
  assert.equal(seed.gltf.animations[0].name, 'Sprout');
});

test('seed: animated channels', () => {
  for (const p of ['translation', 'rotation']) assert.ok(has('SeedRoot', p), `SeedRoot ${p}`);
  for (const n of ['Hinge_L', 'Hinge_R']) assert.ok(has(n, 'rotation'), n);
  for (const n of ['LeafPivot_A', 'LeafPivot_B']) for (const p of ['translation', 'rotation', 'scale']) assert.ok(has(n, p), `${n} ${p}`);
  for (const n of ['Stem', 'Thread', 'Leaf_A', 'Leaf_B']) assert.ok(has(n, 'weights'), `${n} weights`);
});

test('seed: morph targets', () => {
  assert.equal(targets('Stem'), targets('Thread'));
  assert.ok(targets('Stem') >= 6);
  for (const n of ['Leaf_A', 'Leaf_B']) assert.equal(targets(n), 1, n);
});

test('seed: no TRS channel targets a mesh node', () => {
  for (const c of channels) {
    if (c.target.path !== 'weights') assert.equal(sn[c.target.node].mesh, undefined, `${sn[c.target.node].name} ${c.target.path}`);
  }
});

test('seed: every primitive has COLOR_0', () => {
  for (const m of seed.gltf.meshes) for (const p of m.primitives) assert.ok('COLOR_0' in p.attributes, m.name);
});

test('seed: meshopt compression used', () => {
  assert.ok(seed.gltf.extensionsUsed.includes('EXT_meshopt_compression'));
});

// ---- weave: the threads and panel (legacy WeaveScene) and GIEO's two products (the Collections showroom) ----
const weave = load('weave');
const wn = weave.gltf.nodes;
const wNode = (name) => wn.find((x) => x.name === name);
const wMesh = (name) => weave.gltf.meshes[wNode(name).mesh];
const childNames = (name) => (wNode(name).children ?? []).map((i) => wn[i].name).sort();
const BAG = ['NoiBody', 'NoiBand', 'NoiHandle'];
const LIP = ['LipBody', 'LipFront', 'LipFlap', 'LipButton', 'LipLoop', 'LipClasp'];

test('weave: size budget', () => {
  assert.ok(statSync(weave.file).size <= 1.2 * 1024 * 1024);
});

test('weave: triangle budget', () => {
  let tris = 0;
  for (const m of weave.gltf.meshes) {
    for (const p of m.primitives) {
      tris += (p.indices !== undefined ? weave.gltf.accessors[p.indices].count : weave.gltf.accessors[p.attributes.POSITION].count) / 3;
    }
  }
  assert.ok(tris <= 40000, `${tris} triangles`);
});

test('weave: contract nodes exist, and nothing of the old tote, mug or coaster', () => {
  const names = ['WeaveScene', 'Threads', 'Carousel', 'StationBag', 'StationLipstick', 'TurnBag', 'TurnLipstick', 'Panel',
    'NoiHandlePivot', 'LipClaspPivot', ...BAG, ...LIP];
  for (const n of names) assert.ok(wNode(n), n);
  for (const n of [...BAG, ...LIP, 'Threads', 'Panel']) assert.ok(wNode(n).mesh !== undefined, `${n} is a mesh`);
  assert.deepEqual(childNames('Carousel'), ['StationBag', 'StationLipstick']);
  assert.ok(!wn.some((x) => /tote|mug|coaster/i.test(x.name)), 'no node of a product GIEO does not make');
});

test('weave: each product hangs from its own turn node; the handle and the clasp from their pivots', () => {
  assert.deepEqual(childNames('TurnBag'), ['NoiBand', 'NoiBody', 'NoiHandlePivot']);
  assert.deepEqual(childNames('NoiHandlePivot'), ['NoiHandle']);
  assert.deepEqual(childNames('TurnLipstick'), ['LipBody', 'LipButton', 'LipClaspPivot', 'LipFlap', 'LipFront', 'LipLoop']);
  assert.deepEqual(childNames('LipClaspPivot'), ['LipClasp']);
  assert.ok(childNames('StationBag').includes('Panel'), 'the panel stays off the showroom bag');
});

test('weave: the bag is wider than tall, the holder about twice as tall as wide', () => {
  const box = (names) => {
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (const n of names) {
      const acc = weave.gltf.accessors[wMesh(n).primitives[0].attributes.POSITION];
      // meshopt quantises positions to normalised shorts; the node's scale and translation carry the rest
      const node = wNode(n);
      const q = acc.normalized && acc.componentType === 5122 ? 1 / 32767 : 1;
      const sc = node.scale ?? [1, 1, 1];
      const tr = node.translation ?? [0, 0, 0];
      for (let k = 0; k < 3; k++) {
        const a = acc.min[k] * q * sc[k] + tr[k];
        const b = acc.max[k] * q * sc[k] + tr[k];
        lo[k] = Math.min(lo[k], a, b);
        hi[k] = Math.max(hi[k], a, b);
      }
    }
    return hi.map((h, k) => h - lo[k]);
  };
  const [bw, bh] = box(['NoiBody', 'NoiBand']);
  assert.ok(bw / bh > 1.45 && bw / bh < 1.75, `bag ${bw}:${bh}`);
  const [lw, lh] = box(['LipBody']);
  assert.ok(lh / lw > 1.8 && lh / lw < 2.2, `holder ${lw}:${lh}`);
});

test('weave: Panel has exactly 8 morph targets', () => {
  assert.equal(wMesh('Panel').primitives[0].targets.length, 8);
});

test('weave: no animations', () => {
  assert.ok(!weave.gltf.animations?.length);
});

test('weave: every primitive has COLOR_0', () => {
  for (const m of weave.gltf.meshes) for (const p of m.primitives) assert.ok('COLOR_0' in p.attributes, m.name);
});

test('weave: TEXCOORD_0 on the cloth surfaces (the brocade, the panel) and the threads', () => {
  for (const n of ['Panel', 'Threads', 'NoiBand', 'NoiHandle', 'LipFront']) assert.ok('TEXCOORD_0' in wMesh(n).primitives[0].attributes, n);
});

test('weave: meshopt compression used', () => {
  assert.ok(weave.gltf.extensionsUsed.includes('EXT_meshopt_compression'));
});

// Neutrality guard: the placeholder cloth is one flat tone. Remove this only when GIEO's real scan replaces the file.
test('weave: cloth texture is neutral', async () => {
  const { data, info } = await sharp(join(dirname(weave.file), 'weave-cloth.webp')).resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 3);
  for (let c = 0; c < 3; c++) {
    const v = [];
    for (let i = c; i < data.length; i += 3) v.push(data[i]);
    const mean = v.reduce((a, b) => a + b, 0) / v.length;
    const sd = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / v.length);
    assert.ok(sd <= 4, `channel ${c} std ${sd}`);
    assert.ok(Math.max(...v) - Math.min(...v) <= 18, `channel ${c} range`);
  }
});
