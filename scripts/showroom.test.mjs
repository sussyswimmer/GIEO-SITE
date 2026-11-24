import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import { approach, focus, hover, momentum, PRODUCT_KEYS, productPose, runLength, slotOffset, trackProgress, wrap } from '../src/lib/showroom.ts';

test('it glides in from the lower right and out toward the upper left', () => {
  assert.ok(productPose(1).y < 0);
  assert.equal(productPose(0).y, 0);
  assert.ok(productPose(-1).y > 0);
});

test('momentum: scrolling down (row moving left) is positive, clamped', () => {
  assert.ok(momentum(-5, 1440) > 0);
  assert.equal(momentum(-500, 1440), 1);
  assert.equal(momentum(500, 1440), -1);
  assert.equal(momentum(0, 1440), 0);
});

test('wrap keeps the yarn inside its field', () => {
  assert.equal(wrap(5, -2, 2), 1);
  assert.equal(wrap(-3, -2, 2), 1);
  assert.equal(wrap(0.5, -2, 2), 0.5);
});

test("GIEO's two products, the bag then the lipstick holder, and nothing GIEO does not make", () => {
  assert.deepEqual([...PRODUCT_KEYS], ['bag', 'lipstick']);
});

test('the run keeps each product its scroll: three took 300/260svh, two take 219/171svh', () => {
  assert.deepEqual(runLength(3), { phone: 300, desktop: 260 });
  assert.deepEqual(runLength(2), { phone: 219, desktop: 171 });
  assert.deepEqual(runLength(PRODUCT_KEYS.length), runLength(2));
  for (let n = 1; n <= 6; n++) assert.ok(runLength(n).phone >= runLength(n).desktop, `${n} products`);
  // globals.css sets the run: the phone value, then the desktop one from 64rem
  const css = fs.readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
  const runs = [...css.matchAll(/\.showroom-run \{ --run: (\d+)svh/g)].map((m) => Number(m[1]));
  const { phone, desktop } = runLength(PRODUCT_KEYS.length);
  assert.deepEqual(runs, [phone, desktop]);
});

test('track progress: 0 at the pin, 1 when it lets go, clamped', () => {
  assert.equal(trackProgress(0, 3600, 900), 0);
  assert.equal(trackProgress(-2700, 3600, 900), 1);
  assert.equal(trackProgress(-1350, 3600, 900), 0.5);
  assert.equal(trackProgress(500, 3600, 900), 0);
  assert.equal(trackProgress(-9000, 3600, 900), 1);
});

test('slot offset: 0 centred, signed in slot widths', () => {
  assert.equal(slotOffset(320, 800, 1440), 0);
  assert.equal(slotOffset(1120, 800, 1440), 1);
  assert.equal(slotOffset(-480, 800, 1440), -1);
});

test('a centred product is whole and in front; it glides out smaller, further back, then fades', () => {
  const mid = productPose(0);
  assert.equal(mid.scale, 1);
  assert.equal(mid.z, 0);
  assert.equal(mid.opacity, 1);
  const out = productPose(-1);
  assert.ok(out.scale < 0.8 && out.z < -0.49 && out.opacity < 0.5);
  assert.equal(productPose(1.2).opacity, 0);
  assert.equal(focus(0.5) > 0 && focus(0.5) < 1, true);
});

test('it turns as it travels and keeps turning when the scroll stops', () => {
  assert.ok(Math.abs(productPose(-1).yaw - productPose(1).yaw - 2 * Math.PI) < 1e-9);
  assert.notEqual(hover(1, 0).spin, hover(2, 0).spin);
  assert.ok(Math.abs(hover(3, 0.5).y) <= 0.03);
});

test('approach glides toward the target and lands on it', () => {
  let x = 0;
  for (let i = 0; i < 200; i++) x = approach(x, 1);
  assert.equal(x, 1);
  assert.ok(approach(0, 1) < 0.2);
});
