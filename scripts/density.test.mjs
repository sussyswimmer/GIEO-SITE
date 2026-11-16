import { test } from 'node:test';
import assert from 'node:assert';
import { CELL, measure } from './qa-density.mjs';

const W = 320;
const H = 160;
const CREAM = [247, 240, 234];
const PLUM = [46, 35, 64];
const blank = (rgb = CREAM) => Buffer.alloc(W * H * 3).map((_, i) => rgb[i % 3]);
const fill = (buf, x0, y0, x1, y1, rgb) => {
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) rgb.forEach((v, c) => (buf[(y * W + x) * 3 + c] = v));
  return buf;
};

test('a flat section is empty: nothing covered, one band the full height', () => {
  assert.deepEqual(measure(blank(), W, H, () => CREAM), { coverage: 0, band: 1 });
  assert.deepEqual(measure(blank(PLUM), W, H, () => PLUM), { coverage: 0, band: 1 });
});
test('a block covers its cells and splits the bands', () => {
  // full width, rows 64..96 of 160: 4 of 20 cell rows
  const m = measure(fill(blank(), 0, 64, W, 96, PLUM), W, H, () => CREAM);
  assert.equal(m.coverage, 0.2);
  assert.equal(m.band, (8 * CELL) / H); // 8 empty cell rows on either side
});
test('cream to paper (under ΔE 6) is not content; a row is judged against its own section', () => {
  assert.equal(measure(blank([242, 241, 239]), W, H, () => CREAM).coverage, 0);
  const half = fill(blank(), 0, 80, W, H, PLUM); // lower half is a plum section, and empty
  assert.equal(measure(half, W, H, (y) => (y < 80 ? CREAM : PLUM)).coverage, 0);
});
