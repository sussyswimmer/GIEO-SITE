// Self-check for scripts/redact-photos.mjs. Fixtures run in a temp root; the last test only reads
// assets/photos/ to confirm the published originals are still blurred where SOURCES.md says.
// Usage: npm run test:images
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import sharp from 'sharp';
import { run } from './process-images.mjs';
import { REDACTIONS, redact } from './redact-photos.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Flat cream with a 2 px black-and-white checker (high detail, like small print) inside `box`.
async function fixture(file, width, height, box) {
  const px = Buffer.alloc(width * height * 3, 235);
  for (let y = box.y; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      const v = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? 250 : 10;
      px.fill(v, (y * width + x) * 3, (y * width + x) * 3 + 3);
    }
  }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await sharp(px, { raw: { width, height, channels: 3 } }).jpeg({ quality: 94 }).toFile(file);
}

test('redact blurs each box, then leaves the file byte for byte on a second run', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gieo-redact-'));
  try {
    const box = { what: 'print', x: 100, y: 80, w: 120, h: 40 };
    const redactions = { 'journal/sign.jpg': { size: [400, 300], boxes: [box] } };
    const file = path.join(root, 'assets/photos/journal/sign.jpg');
    await fixture(file, 400, 300, box);

    const [checked] = await redact({ root, check: true, redactions });
    assert.deepEqual(checked.open, ['print'], 'a sharp box must be reported');
    assert.equal(checked.changed, false, '--check writes nothing');

    const [first] = await redact({ root, redactions });
    assert.equal(first.changed, true);
    const once = await fs.readFile(file);
    const meta = await sharp(once).metadata();
    assert.equal(meta.exif, undefined);
    assert.deepEqual([meta.width, meta.height], [400, 300]);

    const [second] = await redact({ root, redactions });
    assert.equal(second.changed, false);
    assert.ok(once.equals(await fs.readFile(file)), 'a second run must not re-encode the file');

    // Boxes are pixel positions: a file of another size is refused, not blurred in the wrong place.
    await sharp(once).resize({ width: 200 }).toFile(file);
    await assert.rejects(redact({ root, redactions }), /boxes are for 400x300/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('process-images refuses a listed photo that is not redacted', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'gieo-redact-'));
  try {
    const [key, spec] = Object.entries(REDACTIONS)[0];
    const [width, height] = spec.size;
    const all = { x: 0, y: 0, w: width, h: height };
    await fixture(path.join(root, 'assets/photos', key), width, height, all);
    await fs.writeFile(path.join(root, 'assets/consent.csv'), `filename,consent(yes/no),notes\n${key},yes,fixture\n`);
    await assert.rejects(run({ root }), /is not redacted/);
    await assert.rejects(fs.access(path.join(root, 'public/img')), 'nothing may be written');
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('every listed original in assets/photos/ is blurred in its boxes', async () => {
  const rows = await redact({ root: REPO, check: true });
  assert.equal(rows.length, Object.keys(REDACTIONS).length);
  for (const r of rows) assert.deepEqual(r.open, [], `${r.file}: run node scripts/redact-photos.mjs`);
});
