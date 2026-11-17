import { test } from 'node:test';
import assert from 'node:assert';
import { act1, fallPoint, remap, SEED_AT, stages } from '../src/lib/vine.ts';

test('act 1 runs over 180svh of scroll into the hero, clamped', () => {
  assert.equal(act1(0, 900), 0);
  assert.equal(act1(-1620, 900), 1);
  assert.equal(act1(-810, 900), 0.5);
  assert.equal(act1(200, 900), 0);
  assert.equal(act1(-9000, 900), 1);
});

test('the vine journeys round the letters first, at an even pace; the tree sprouts after', () => {
  assert.equal(stages(0).vine, 0.14); // already on screen at load
  assert.ok(Math.abs(stages(0.25).vine - 0.57) < 1e-9); // linear: the tip never stalls
  assert.equal(stages(0.5).vine, 1);
  assert.equal(stages(0.46).trunk, 0); // nothing of the tree before the vine has arrived
  const mid = stages(0.7);
  assert.ok(mid.trunk === 1 && mid.branches > 0.5 && mid.leaves > 0 && mid.blossoms === 0);
  assert.equal(stages(0.86).swell, 1);
  assert.equal(stages(0.86).fall, 0);
  assert.equal(stages(0.975).fall, 1);
});

test('handoff: the backdrop fades only as the seed lands, and is gone when the film takes over', () => {
  assert.equal(stages(0.95).fade, 0);
  assert.ok(stages(0.955).fall > 0.6); // nearly down before the film's seed shows under it
  assert.equal(stages(0.975).fall, 1);
  assert.equal(stages(1).fade, 1);
});

test('the seed lands exactly on its mark', () => {
  assert.deepEqual(fallPoint([0, 3], [1, -1], 1), [1, -1]);
  assert.deepEqual(fallPoint([0, 3], [1, -1], 0), [0, 3]);
  assert.ok(fallPoint([0, 3], [1, -1], 0.1)[1] > 3 - 0.5); // a lift before the drop
});

test('remap moves the old hero timeline after act 1', () => {
  assert.equal(remap(0, 0.4), 0.4);
  assert.equal(remap(1, 0.4), 1);
  assert.equal(remap(0.5, 0), 0.5);
});

test('every film set has its seed mark inside the frame', () => {
  for (const { at, h } of Object.values(SEED_AT)) {
    assert.ok(at[0] > 0 && at[0] < 1 && at[1] > 0 && at[1] < 1 && h > 0.1 && h < 0.5);
  }
});
