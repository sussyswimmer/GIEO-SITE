// Phase 6 capture: renders the Lite scrub videos and Still posters from the real-time scenes (spec D1-D5).
// Usage: node scripts/render-fallbacks.mjs --base http://localhost:3101 [--scenes seed,weave,lotus]
//   [--tmp D:/claude-scratch/gieo/fallback-frames] [--sheets D:/claude-scratch/gieo/fallback-sheets]
// Needs a running production server whose build has the `pose` QA hook (it starts and stops nothing) and ffmpeg on PATH.
// Writes public/video/<scene>.mp4 (premultiplied RGB | alpha, 1440x1080, all-intra) and public/posters/<scene>-<k>-<720|1080>.webp.

import { chromium } from 'playwright';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { TRACKS } from '../src/lib/fallback-timeline.ts';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = arg('base', 'http://localhost:3101').replace(/\/+$/, '');
const scenes = arg('scenes', 'seed,weave,lotus').split(',');
const tmp = path.resolve(arg('tmp', 'D:/claude-scratch/gieo/fallback-frames'));
const sheetsDir = path.resolve(arg('sheets', 'D:/claude-scratch/gieo/fallback-sheets'));
const videoDir = path.join(ROOT, 'public/video');
const posterDir = path.join(ROOT, 'public/posters');

const W = 1080, H = 1620; // captured px (720x1080 CSS at 1.5x)
const VW = 720, VH = 1080; // video half
const FEATHER = 0.06;
const MAX_BYTES = 2_700_000; // 3 MB with 10% margin
const ANCHOR = { seed: null, weave: '#craft', lotus: '#pillars' };
const TONE = { seed: '--cream', weave: '--paper', lotus: '--cream' };
const ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'];

const die = (m) => {
  console.error(`render-fallbacks: ${m}`);
  process.exit(1);
};
if (spawnSync('ffmpeg', ['-version']).error) die('ffmpeg not found on PATH');
try {
  if (!(await fetch(base)).ok) die(`${base} answered with an error`);
} catch {
  die(`server not reachable at ${base} (start the production build first)`);
}
for (const s of scenes) if (!TRACKS[s]) die(`unknown scene ${s}`);
for (const d of [videoDir, posterDir, sheetsDir, tmp]) fs.mkdirSync(d, { recursive: true });

const tokens = fs.readFileSync(path.join(ROOT, 'src/styles/tokens.css'), 'utf8');
const tone = (name) => tokens.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? die(`${name} not in tokens.css`);

// Feather mask (D3): smoothstep over the outer 6% of width and height, all four edges.
const edge = (n) => {
  const m = new Float32Array(n), span = FEATHER * n;
  for (let i = 0; i < n; i++) {
    const x = Math.min(1, Math.min(i + 0.5, n - i - 0.5) / span);
    m[i] = x * x * (3 - 2 * x);
  }
  return m;
};
const MX = edge(W), MY = edge(H);
function feather(buf) {
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4 + 3;
      buf[i] = Math.round(buf[i] * MX[x] * MY[y]);
    }
  return buf;
}

const rgba = (buf, w, h) => sharp(buf, { raw: { width: w, height: h, channels: 4 } });
// On the premultiplied side-by-side frame: straight RGB under near-zero alpha is noise and would read as a pop.
const meanAbsDiff = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};

async function capture(browser, scene) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1200 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', String(e)));
  await page.goto(`${base}/?tier=full`, { waitUntil: 'load' });
  await page.waitForSelector('html[data-canvas="ready"]', { timeout: 30000 });
  if (!(await page.evaluate(() => typeof window.__gieoMotion?.pose === 'function'))) die('server build has no pose hook');
  const anchor = ANCHOR[scene];
  const y = anchor ? await page.evaluate((a) => document.querySelector(a).getBoundingClientRect().top + scrollY, anchor) : 0;
  await page.evaluate((y) => scrollTo(0, y), y);
  await page.waitForTimeout(2000);
  await page.addStyleTag({
    content: `
    html, body { background: transparent !important; }
    body * { visibility: hidden !important; }
    canvas { visibility: visible !important; }
    [data-scene-stage="${scene}"] { position: fixed !important; left: 280px !important; top: 240px !important;
      width: 720px !important; height: 720px !important; aspect-ratio: auto !important; margin: 0 !important; translate: none !important; }`,
  });
  await page.evaluate((s) => window.__gieoMotion.pose(s, 0.5), scene);
  await page.waitForSelector(`html[data-${scene}="ready"]`, { timeout: 60000 });
  await page.waitForTimeout(1500);
  // Seed idle bob is sin(performance.now()/3000*2pi): freeze the clock on a whole period so it is exactly 0.
  if (scene === 'seed')
    await page.evaluate(() => {
      const T = 3000 * Math.ceil(performance.now() / 3000 + 1);
      performance.now = () => T;
    });
  const grab = async (t) => {
    await page.evaluate((a) => window.__gieoMotion.pose(a[0], a[1]), [scene, t]);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    const png = await page.screenshot({ clip: { x: 280, y: 60, width: 720, height: 1080 }, omitBackground: true });
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== W || info.height !== H || info.channels !== 4) die(`unexpected capture ${info.width}x${info.height}x${info.channels}`);
    return feather(data);
  };
  return { grab, close: () => ctx.close() };
}

async function encode(dir, scene) {
  const out = path.join(videoDir, `${scene}.mp4`);
  const run = (crf) => {
    const r = spawnSync(
      'ffmpeg',
      ['-y', '-v', 'error', '-framerate', '24', '-i', path.join(dir, 'sbs-%03d.png'),
        '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'slow',
        '-profile:v', 'high', '-crf', String(crf), '-g', '1', '-keyint_min', '1', '-sc_threshold', '0', '-bf', '0',
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
        '-movflags', '+faststart', '-an', out],
      { encoding: 'utf8' },
    );
    if (r.status !== 0) die(`ffmpeg encode failed: ${r.stderr}`);
    return fs.statSync(out).size;
  };
  // Lowest CRF >= 18 that fits (size falls as CRF rises): bisect.
  let lo = 18, hi = 40, size = run(lo);
  if (size > MAX_BYTES) {
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (run(mid) > MAX_BYTES) lo = mid;
      else hi = mid;
    }
    size = run(hi);
    if (size > MAX_BYTES) die(`${scene}.mp4 is ${size} bytes even at CRF ${hi}`);
    return { crf: hi, size };
  }
  return { crf: lo, size };
}

// Decode video frame n and rebuild straight RGBA (720x1080) from the premultiplied-RGB | alpha halves.
function decode(scene, n) {
  const r = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-i', path.join(videoDir, `${scene}.mp4`), '-vf', `select=eq(n\\,${n}),scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24`,
      '-frames:v', '1', '-fps_mode', 'passthrough', '-f', 'rawvideo', '-'],
    { maxBuffer: 1 << 28 },
  );
  if (r.status !== 0 || r.stdout.length !== 2 * VW * VH * 3) die(`decode ${scene} #${n} failed: ${r.stderr}`);
  const d = r.stdout, out = Buffer.alloc(VW * VH * 4);
  for (let y = 0; y < VH; y++)
    for (let x = 0; x < VW; x++) {
      const c = (y * 2 * VW + x) * 3, a = d[(y * 2 * VW + VW + x) * 3], o = (y * VW + x) * 4;
      for (let k = 0; k < 3; k++) out[o + k] = a ? Math.min(255, Math.round((d[c + k] * 255) / a)) : 0;
      out[o + 3] = a;
    }
  return out;
}

function compare(src, dec) {
  let amax = 0, asum = 0;
  const errs = new Uint32Array(256);
  let nOpaque = 0, csum = 0;
  for (let i = 0; i < VW * VH; i++) {
    const e = Math.abs(src[i * 4 + 3] - dec[i * 4 + 3]);
    amax = Math.max(amax, e);
    asum += e;
    if (src[i * 4 + 3] === 255) {
      for (let k = 0; k < 3; k++) {
        const ce = Math.abs(src[i * 4 + k] - dec[i * 4 + k]);
        errs[ce]++;
        csum += ce;
      }
      nOpaque += 3;
    }
  }
  let acc = 0, p99 = 0;
  for (let v = 0; v < 256 && nOpaque; v++) {
    acc += errs[v];
    if (acc >= 0.99 * nOpaque) {
      p99 = v;
      break;
    }
  }
  return { alphaMax: amax, alphaMean: +(asum / (VW * VH)).toFixed(3), colourMean: +(csum / Math.max(1, nOpaque)).toFixed(3), colourP99: p99, opaquePx: nOpaque / 3 };
}

const report = {};
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ARGS });
try {
  for (const scene of scenes) {
    const { frames, keys } = TRACKS[scene];
    const dir = path.join(tmp, scene);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const mid = frames >> 1, check = [0, mid, frames - 1];
    const cap = await capture(browser, scene);
    const refs = {}, diffs = [], cells = [];
    let prev = null;
    for (let f = 0; f < frames; f++) {
      const full = await cap.grab(f / (frames - 1));
      // sharp premultiplies for the resize, so edges do not bleed black.
      const half = await rgba(full, W, H).resize(VW, VH, { kernel: 'lanczos3' }).raw().toBuffer();
      const sbs = Buffer.alloc(2 * VW * VH * 3);
      for (let p = 0; p < VW * VH; p++) {
        const a = half[p * 4 + 3], y = Math.floor(p / VW), x = p % VW, l = (y * 2 * VW + x) * 3, r = l + VW * 3;
        for (let k = 0; k < 3; k++) sbs[l + k] = Math.round((half[p * 4 + k] * a) / 255);
        sbs[r] = sbs[r + 1] = sbs[r + 2] = a;
      }
      await sharp(sbs, { raw: { width: 2 * VW, height: VH, channels: 3 } })
        .png({ compressionLevel: 1 })
        .toFile(path.join(dir, `sbs-${String(f + 1).padStart(3, '0')}.png`));
      if (check.includes(f)) refs[f] = half;
      if (prev) diffs.push(+meanAbsDiff(prev, sbs).toFixed(3));
      prev = sbs;
      if (f % 10 === 0) cells.push(await rgba(half, VW, VH).resize(180, 270).raw().toBuffer());
      if (f % 20 === 0) process.stdout.write(`${scene} ${f}/${frames}\r`);
    }
    // Posters at the exact key t (not snapped to a video frame).
    const posters = [];
    for (const [k, t] of keys.entries()) {
      const full = await cap.grab(t);
      for (const w of [720, 1080]) {
        const file = path.join(posterDir, `${scene}-${k}-${w}.webp`);
        let img = rgba(full, W, H);
        if (w !== W) img = img.resize(w, Math.round((w * H) / W), { kernel: 'lanczos3' });
        await img.webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(file);
        posters.push({ file: path.basename(file), bytes: fs.statSync(file).size });
      }
    }
    await cap.close();

    // Contact sheet: every 10th frame, flattened on the section tone.
    const cols = 8, rows = Math.ceil(cells.length / cols);
    await sharp({ create: { width: cols * 180, height: rows * 270, channels: 3, background: tone(TONE[scene]) } })
      .composite(cells.map((c, i) => ({ input: c, raw: { width: 180, height: 270, channels: 4 }, left: (i % cols) * 180, top: Math.floor(i / cols) * 270 })))
      .png()
      .toFile(path.join(sheetsDir, `${scene}.png`));

    const { crf, size } = await encode(dir, scene);
    const decoded = check.map((n) => ({ frame: n, ...compare(refs[n], decode(scene, n)) }));
    const sorted = [...diffs].sort((a, b) => a - b);
    report[scene] = {
      crf, bytes: size, decoded,
      frameDiff: { first12: diffs.slice(0, 12), median: sorted[sorted.length >> 1], max: sorted.at(-1), maxAt: diffs.indexOf(sorted.at(-1)) + 1 },
      posters,
    };
    console.log(`${scene}: CRF ${crf}, ${size} bytes, ${posters.length} posters`);
  }
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 1));
