import { test } from 'node:test';
import assert from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { TRACKS, WEAVE_PACE, WEAVE_PRODUCTS, beatsAt, timeOf, frameAt, keyAt, weaveRun } from '../src/lib/fallback-timeline.ts';

const state = (scene, v) => {
  const s = { seed: 0, weave: {}, lotus: {} };
  if (scene === 'seed') s.seed = v[0];
  else TRACKS[scene].beats.forEach((b, i) => (s[scene][b] = v[i]));
  return s;
};

for (const scene of ['seed', 'weave', 'lotus']) {
  test(`${scene}: timeOf inverts beatsAt`, () => {
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      assert.ok(Math.abs(timeOf(scene, state(scene, beatsAt(scene, t))) - t) < 1e-9, `t ${t}`);
    }
  });
  test(`${scene}: t never falls as any beat rises`, () => {
    const n = TRACKS[scene].beats.length;
    for (let k = 0; k < n; k++) {
      const v = Array(n).fill(0.5);
      const before = timeOf(scene, state(scene, v));
      v[k] = 0.6;
      assert.ok(timeOf(scene, state(scene, v)) > before);
    }
  });
  test(`${scene}: frames and keys cover the ends`, () => {
    assert.equal(frameAt(scene, 0), 0);
    assert.equal(frameAt(scene, 1), TRACKS[scene].frames - 1);
    const { keys } = TRACKS[scene];
    assert.equal(keyAt(scene, 1), keys.length - 1);
    keys.forEach((k, i) => assert.equal(keyAt(scene, k), i));
  });
}

// docs/08 H2: each product rests for at least 45svh and a change takes at most 30svh. The brief also asked
// that its three products span at least 210svh on desktop and 150svh on a phone: 70 and 50 a product. With
// two products (the Nối Bag, the Nếp Keychain) that is held per product, each product owning the change that
// brings it on (the cloth becoming the bag is one; qa-fuller-b holds it to the same 30svh) and its rest.
// A rest is on the product's last frame, which is a Still key: the Still tier and the QA hook (pose) show
// the same picture the scrubbed film rests on.
test('weave: the product run meets the brief, and every rest is a Still key', () => {
  assert.deepEqual(WEAVE_PRODUCTS, ['bag', 'lipstick']);
  const n = WEAVE_PRODUCTS.length;
  for (const [size, pace] of Object.entries(WEAVE_PACE)) {
    assert.ok(pace.hold >= 45, `${size} hold ${pace.hold}svh`);
    assert.ok(pace.change <= 30, `${size} change ${pace.change}svh`);
    // the names pin for a rest per product and a change between each two
    assert.equal(weaveRun(pace), n * pace.hold + (n - 1) * pace.change, `${size} run`);
    const each = { wide: 70, phone: 50 }[size];
    assert.ok(weaveRun(pace) + pace.change >= n * each, `${size}: ${n} products span ${weaveRun(pace) + pace.change}svh with their changes (floor ${n * each})`);
  }
  const { beats, keys } = TRACKS.weave;
  WEAVE_PRODUCTS.forEach((product) => {
    const done = beats.map((_, k) => (k <= beats.indexOf(product) ? 1 : 0));
    const t = timeOf('weave', state('weave', done));
    assert.ok(Math.abs(keys[keyAt('weave', t)] - t) < 1e-9, `${product} rests on a Still key`);
    assert.equal(frameAt('weave', t), { bag: 129, lipstick: 149 }[product]);
  });
});

// docs/07 §4: public/film/<scene>/manifest.json is the film's source of truth. When a film has been
// rendered, the site's timeline must agree with it; with no film yet there is nothing to hold it to.
const BEATS = {
  // the frames each film beat covers, straight from the brief; the seed is one scrub, so its beats are its keys
  seed: { fall: [0, 40], sprout: [40, 95], thread: [95, 149] },
  weave: { thread: [0, 30], warps: [30, 50], weave: [50, 89], drape: [89, 109], bag: [109, 129], lipstick: [129, 149] },
  lotus: { rise: [0, 20], p1: [20, 51], p2: [51, 82], p3: [82, 113], bloom: [113, 128], finale: [128, 159] },
};

for (const scene of ['seed', 'weave', 'lotus']) {
  test(`${scene}: the brief's beats tile the film end to end`, () => {
    const spans = Object.values(BEATS[scene]);
    assert.equal(spans[0][0], 0);
    assert.equal(spans.at(-1)[1], TRACKS[scene].frames - 1);
    spans.slice(1).forEach(([a], i) => assert.equal(a, spans[i][1], 'neighbours share an endpoint'));
  });

  if (scene !== 'seed')
    test(`${scene}: each beat's weight puts it on the brief's frames (within one frame)`, () => {
      TRACKS[scene].beats.forEach((beat, i) => {
        const v = TRACKS[scene].beats.map((_, k) => (k <= i ? 1 : 0));
        const end = frameAt(scene, timeOf(scene, state(scene, v)));
        assert.ok(Math.abs(end - BEATS[scene][beat][1]) <= 1, `${beat} ends on ${end}, brief says ${BEATS[scene][beat][1]}`);
      });
    });

  const file = new URL(`../public/film/${scene}/manifest.json`, import.meta.url);
  test(`${scene}: TRACKS matches the rendered film's manifest`, { skip: !existsSync(file) && 'no film rendered yet' }, () => {
    const m = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(m.scene, scene);
    assert.equal(m.frames, TRACKS[scene].frames);
    assert.deepEqual(m.beats, BEATS[scene]);
    m.keys.forEach((k) => assert.ok(Number.isInteger(k) && k >= 0 && k < m.frames, `key ${k}`));
  });
}
