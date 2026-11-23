import { test } from 'node:test';
import assert from 'node:assert';
import { CLOTH_AT, FILM_START, ROOT_AT, rootStages, rootsT } from '../src/lib/roots.ts';

test('the run starts with the hero still on screen and takes 1.1 screens', () => {
  assert.equal(rootsT(1.15 * 900, 900), 0);
  assert.ok(Math.abs(rootsT(0.05 * 900, 900) - 1) < 1e-9);
  assert.equal(rootsT(3 * 900, 900), 0);
  assert.equal(rootsT(-900, 900), 1);
  assert.equal(FILM_START, 'top 5%'); // the film waits on its cloth until the run is over
});

test('roots, then threads, then weaving, then the film: in that order, with no gap', () => {
  assert.equal(rootStages(0).roots, 0);
  assert.equal(rootStages(0.44).roots, 1);
  assert.equal(rootStages(0.34).warps, 0);
  assert.equal(rootStages(0.64).warps, 1);
  assert.equal(rootStages(0.58).weave, 0);
  assert.ok(Math.abs(rootStages(0.92).weave - 1) < 1e-9);
  assert.equal(rootStages(0.92).handoff, 0); // the cloth is whole before the film takes it
  assert.equal(rootStages(1).handoff, 1);
  // something is always under way
  for (let i = 1; i < 100; i++) {
    const a = rootStages(i / 100);
    const b = rootStages((i + 1) / 100);
    assert.ok(a.roots !== b.roots || a.warps !== b.warps || a.weave !== b.weave || a.handoff !== b.handoff, `still at ${i / 100}`);
  }
});

test('marks are inside their frames', () => {
  for (const [x, y] of Object.values(ROOT_AT)) assert.ok(x > 0 && x < 1 && y > 0.5 && y < 1);
  const [x0, y0, x1, y1] = CLOTH_AT;
  assert.ok(x0 < x1 && y0 < y1 && x0 > 0 && y1 < 1);
});
