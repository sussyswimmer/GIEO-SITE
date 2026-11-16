import { test } from 'node:test';
import assert from 'node:assert';
import { coverPoint, frameOf, keyUrl, nearestKey, pickSet } from '../src/lib/film.ts';

// The seed film's sets, as in docs/07-redesign.md §4.
const L = { id: 'l', w: 1920, h: 1080, focus: [0.62, 0.5] };
const LS = { id: 'ls', w: 1280, h: 720, focus: [0.62, 0.5] };
const P = { id: 'p', w: 900, h: 1200, focus: [0.5, 0.6] };
const SETS = [L, LS, P];

test('frameOf: 0-based, rounded, clamped', () => {
  assert.equal(frameOf({ frames: 150 }, 0), 0);
  assert.equal(frameOf({ frames: 150 }, 1), 149);
  assert.equal(frameOf({ frames: 150 }, 0.5), 75);
  assert.equal(frameOf({ frames: 150 }, 7), 149);
  assert.equal(frameOf({ frames: 150 }, -1), 0);
});
test('nearestKey: index of the closest still', () => {
  const keys = [0, 40, 95, 149];
  assert.equal(nearestKey(keys, 0), 0);
  assert.equal(nearestKey(keys, 21), 1);
  assert.equal(nearestKey(keys, 67), 1);
  assert.equal(nearestKey(keys, 68), 2);
  assert.equal(nearestKey(keys, 149), 3);
});
test('pickSet: aspect first, then the smaller set for Lite or a narrow box', () => {
  assert.equal(pickSet(SETS, 1440, 900, false).id, 'l');
  assert.equal(pickSet(SETS, 1440, 900, true).id, 'ls');
  assert.equal(pickSet(SETS, 800, 600, false).id, 'ls');
  assert.equal(pickSet(SETS, 390, 844, false).id, 'p');
  assert.equal(pickSet([L, LS], 390, 844, false).id, 'ls'); // no portrait set: fall back to what there is
});
test('coverPoint: the focus stays put; the frame overflows the box around it', () => {
  // 1920×1080 into 1440×900: scale 0.8333, drawn 1600 wide, so 160 px hang off, 62 % of it on the left
  const [fx, fy] = coverPoint(L, 1440, 900, [0.62, 0.5]);
  assert.ok(Math.abs(fx - 0.62 * 1440) < 1e-6 && Math.abs(fy - 450) < 1e-6);
  const [x0] = coverPoint(L, 1440, 900, [0, 0]);
  assert.ok(Math.abs(x0 - -160 * 0.62) < 1e-6);
  assert.deepEqual(coverPoint(P, 900, 1200, [0.5, 0]), [450, 0]); // exact fit
});
test('keyUrl: 4-digit, 0-based', () => assert.equal(keyUrl('seed', P, 40), '/film/seed/keys/p-0040.webp'));
