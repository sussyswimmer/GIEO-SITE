// Blurs what must not be published out of a source photo, in the file itself (assets/photos/), so no
// copy that reaches public/ or git can show it. The boxes are listed in assets/photos/SOURCES.md.
// Usage: node scripts/redact-photos.mjs [--root <dir>] [--check]
//
// Re-runnable: a box that already shows no detail is left as it is, and a file whose boxes all show
// none is not rewritten (no second JPEG pass). --check writes nothing and exits 1 if any box still
// shows detail. scripts/process-images.mjs runs the same check and refuses an unredacted file.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

/** Pixel boxes (x, y, w, h) in the source file at `size`. Keys are paths under assets/photos/. */
export const REDACTIONS = {
  'journal/02-stilt-house.jpg': {
    size: [2400, 1600],
    boxes: [
      { what: "shop sign: the partner's name and logo, a trade line, an email and a street address", x: 1320, y: 965, w: 245, h: 105 },
      { what: 'car number plate', x: 392, y: 1312, w: 38, h: 24 },
      { what: 'motorbike number plate', x: 12, y: 1312, w: 22, h: 20 },
      { what: 'motorbike number plate', x: 100, y: 1302, w: 30, h: 22 },
      { what: 'motorbike number plate', x: 186, y: 1296, w: 38, h: 28 },
      { what: 'motorbike number plate', x: 352, y: 1316, w: 32, h: 24 },
    ],
  },
};

// Mean |pixel - gaussian(1.5)| in grey levels. Text and plates in these frames measure 10 to 21,
// plain lawn about 15, open sky under 0.1; a box blurred by redact() measures under 1.
export const DETAIL_MAX = 3;
const JPEG = { quality: 94, chromaSubsampling: '4:2:0' };

async function detail(img, { x, y, w, h }) {
  const grey = await sharp(img).extract({ left: x, top: y, width: w, height: h }).greyscale().raw().toBuffer();
  const soft = await sharp(grey, { raw: { width: w, height: h, channels: 1 } })
    .blur(1.5)
    .toColourspace('b-w')
    .raw()
    .toBuffer();
  let sum = 0;
  for (let i = 0; i < grey.length; i++) sum += Math.abs(grey[i] - soft[i]);
  return sum / grey.length;
}

// Pixelate then blur the box and a margin around it, and lay it back with a feathered edge so the
// patch reads as soft focus, not as a rectangle. Strength scales with the box (a plate gets sigma 4 to
// 6, the sign 10) and stays inside it plus a narrow feather, so the posts and beams around stay sharp.
async function patch(img, W, H, box) {
  const sigma = Math.min(10, Math.max(4, Math.min(box.w, box.h) / 5));
  const margin = Math.ceil(sigma / 2);
  const pad = margin + Math.ceil(2 * sigma);
  const left = Math.max(0, box.x - pad);
  const top = Math.max(0, box.y - pad);
  const right = Math.min(W, box.x + box.w + pad);
  const bottom = Math.min(H, box.y + box.h + pad);
  const pw = right - left;
  const ph = bottom - top;

  const block = Math.max(3, Math.round(sigma));
  const small = await sharp(img)
    .extract({ left, top, width: pw, height: ph })
    .resize({ width: Math.max(1, Math.round(pw / block)), height: Math.max(1, Math.round(ph / block)), kernel: 'cubic' })
    .toBuffer();
  const soft = await sharp(small)
    .resize({ width: pw, height: ph, kernel: 'cubic' })
    .blur(sigma)
    .removeAlpha()
    .raw()
    .toBuffer();

  // Alpha: the box grown by `margin`, softened by margin / 2, so the box itself is fully covered.
  const solid = Buffer.alloc(pw * ph, 0);
  for (let yy = 0; yy < ph; yy++) {
    for (let xx = 0; xx < pw; xx++) {
      const gx = left + xx;
      const gy = top + yy;
      if (gx >= box.x - margin && gx < box.x + box.w + margin && gy >= box.y - margin && gy < box.y + box.h + margin) {
        solid[yy * pw + xx] = 255;
      }
    }
  }
  const alpha = await sharp(solid, { raw: { width: pw, height: ph, channels: 1 } })
    .blur(Math.max(0.3, margin / 2))
    .toColourspace('b-w')
    .raw()
    .toBuffer();
  // Inside the box itself nothing of the original is kept.
  for (let yy = 0; yy < ph; yy++) {
    for (let xx = 0; xx < pw; xx++) {
      const gx = left + xx;
      const gy = top + yy;
      if (gx >= box.x && gx < box.x + box.w && gy >= box.y && gy < box.y + box.h) alpha[yy * pw + xx] = 255;
    }
  }
  const input = await sharp(soft, { raw: { width: pw, height: ph, channels: 3 } })
    .joinChannel(alpha, { raw: { width: pw, height: ph, channels: 1 } })
    .png()
    .toBuffer();
  return { input, left, top };
}

/** Checks (and unless `check`, applies) every redaction under `root`. Returns one row per file. */
export async function redact({ root, check = false, redactions = REDACTIONS }) {
  const rows = [];
  for (const [rel, spec] of Object.entries(redactions)) {
    const file = path.join(root, 'assets/photos', rel);
    const original = await fs.readFile(file);
    const { width: W, height: H } = await sharp(original).metadata();
    if (W !== spec.size[0] || H !== spec.size[1]) {
      throw new Error(`${rel} is ${W}x${H}, but its redaction boxes are for ${spec.size.join('x')}. Re-measure them.`);
    }
    const before = await Promise.all(spec.boxes.map((b) => detail(original, b)));
    const open = spec.boxes.filter((_, i) => before[i] > DETAIL_MAX);
    if (open.length === 0 || check) {
      rows.push({ file: rel, changed: false, open: open.map((b) => b.what) });
      continue;
    }
    const patches = [];
    for (const b of spec.boxes) patches.push(await patch(original, W, H, b));
    const out = await sharp(original).composite(patches).jpeg(JPEG).toBuffer();
    const after = await Promise.all(spec.boxes.map((b) => detail(out, b)));
    const still = spec.boxes.filter((_, i) => after[i] > DETAIL_MAX);
    if (still.length) throw new Error(`${rel}: blur left detail in ${still.map((b) => b.what).join('; ')}`);
    await fs.writeFile(file, out);
    rows.push({ file: rel, changed: true, open: [] });
  }
  return rows;
}

function parseArgs(argv) {
  const i = argv.indexOf('--root');
  const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  return { root: i >= 0 && argv[i + 1] ? path.resolve(argv[i + 1]) : repo, check: argv.includes('--check') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const { root, check } = parseArgs(process.argv.slice(2));
  const rows = await redact({ root, check });
  let failed = false;
  for (const r of rows) {
    if (r.open.length) {
      failed = true;
      console.error(`${r.file}: not redacted: ${r.open.join('; ')}`);
    } else {
      console.log(`${r.file}: ${r.changed ? 'redacted' : 'already redacted, unchanged'}`);
    }
  }
  if (failed) process.exit(1);
}
