// Films (docs/07-redesign.md §4): PNG masters from blender/film/*.py -> scrubbed all-intra H.264, WebP keys, manifests,
// still-lifes and contact sheets.
// Usage: node scripts/encode-film.mjs [--scenes seed,weave,lotus,stills] [--raw D:/claude-scratch/gieo/film/raw]
//          [--sheets D:/claude-scratch/gieo/film/sheets] [--tmp D:/claude-scratch/gieo/film/tmp]
//        node scripts/encode-film.mjs --look seed:l:0,40,95 [--raw DIR]   (look-dev: composited montage only, no encode)
// Writes public/film/<scene>/{manifest.json, <set>.mp4, keys/<set>-<iiii>.webp} and public/film/stills/*.webp.
// `seed` is opaque: the render's alpha is laid on flat --cream with the peach sun. `weave` and `lotus` keep alpha as
// side-by-side video (premultiplied RGB | alpha), like public/video/*.mp4. Sheets are decoded back from the mp4s.
// Draft masters (half size) encode at their true size; the manifest always states what is on disk.

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const die = (m) => {
  console.error(`encode-film: ${m}`);
  process.exit(1);
};
const RAW = path.resolve(arg('raw', 'D:/claude-scratch/gieo/film/raw'));
const SHEETS = path.resolve(arg('sheets', 'D:/claude-scratch/gieo/film/sheets'));
const TMP = path.resolve(arg('tmp', 'D:/claude-scratch/gieo/film/tmp'));
const OUT = path.resolve(arg('out', path.join(ROOT, 'public/film'))); // --out: look-dev only (drafts stay out of the repo)
const FPS = 30;

const tokens = fs.readFileSync(path.join(ROOT, 'src/styles/tokens.css'), 'utf8');
const hex = (name) => tokens.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})`))?.[1] ?? die(`--${name} not in tokens.css`);
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// The contract. `from` is the rendered set a published set is cut from; `max` the byte ceiling of its mp4.
const FILMS = {
  seed: {
    frames: 150, alpha: false, bg: 'cream', keys: [0, 40, 95, 149],
    beats: { fall: [0, 40], sprout: [40, 95], thread: [95, 149] },
    sets: [
      { id: 'l', from: 'l', aspect: 'landscape', w: 1920, h: 1080, max: 8e6 },
      { id: 'ls', from: 'l', aspect: 'landscape', w: 1280, h: 720, max: 4e6 },
      { id: 'p', from: 'p', aspect: 'portrait', w: 900, h: 1200, max: 4e6 },
    ],
  },
  weave: {
    frames: 170, alpha: true, bg: 'plum-ink', keys: [0, 50, 89, 129, 149, 169],
    // 5.5 %, not 7: the tote's handles top out 5.6 % from the edge and the mug's handle 6.3 %, and stay solid
    feather: { edges: 'ltrb', width: 0.055, shadow: 0.2 },
    beats: { thread: [0, 30], warps: [30, 50], weave: [50, 89], drape: [89, 109], tote: [109, 129], mug: [129, 149], coaster: [149, 169] },
    sets: [{ id: 's', from: 's', aspect: 'square', w: 960, h: 960, max: 5e6, focus: [0.5, 0.5] }],
  },
  lotus: {
    frames: 160, alpha: true, bg: 'cream', keys: [20, 51, 82, 113, 128, 159],
    feather: { edges: 'ltr', width: 0.07 }, // not the bottom: the stem rises from the section's edge
    beats: { rise: [0, 20], p1: [20, 51], p2: [51, 82], p3: [82, 113], bloom: [113, 128], finale: [128, 159] },
    sets: [{ id: 's', from: 's', aspect: 'square', w: 960, h: 960, max: 4e6, focus: [0.5, 0.5] }],
  },
};
const STILL_EDGE = 1600, STILL_MAX = 150_000;
// A still's shadow: how much of the rendered shadow is kept, how far from the object it reaches (in long edges), how
// far plum is warmed with peach for its colour, and the clear margin and fade-in at the frame's edge (in short edges).
const SHADOW = { keep: 0.5, reach: 0.08, warm: 0.35, margin: 0.015, fade: 0.05 };

const pad = (n) => String(n).padStart(4, '0');
const even = (n) => Math.max(2, Math.round(n / 2) * 2);
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The seed film's sky: flat --cream with the page's peach sun as a soft bloom, top left. It fades to nothing before
// the edges, so the top and sides of the opaque film are exactly --cream and meet the page.
function sky(w, h) {
  const cream = rgb(hex('cream')), peach = rgb(hex('peach-glow')), buf = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const d = Math.hypot((u - 0.27) / 0.27, (v - 0.36) / 0.36); // reaches 0 exactly at the left and top edges
      const a = 0.5 * (1 - smooth(0, 1, d)) ** 2;
      for (let c = 0; c < 3; c++) buf[(y * w + x) * 3 + c] = Math.round(cream[c] + (peach[c] - cream[c]) * a);
    }
  return buf;
}

// An alpha film's matte falls to nothing over the outer `width` (cast shadows: `shadow`) of the film's feathered edges (l, t, r, b): whatever
// reaches the canvas edge (threads, cast shadows) fades out instead of ending in a straight cut on the page.
function feather(d, w, h, f) {
  if (!f) return d;
  // clear for the outermost 1.2 % first: H.264 smears a ramp that starts on the very first line back onto the edge
  const on = (e, at, size, width) => (f.edges.includes(e) ? smooth(0.012 * size, width * size, at + 0.5) : 1);
  const mask = (x, y, width) => on('t', y, h, width) * on('b', h - 1 - y, h, width) * on('l', x, w, width) * on('r', w - 1 - x, w, width);
  for (let y = 0, i = 0; y < h; y++)
    for (let x = 0; x < w; x++, i += 4) {
      if (!d[i + 3]) continue;
      // a cast shadow (black, not opaque) has no outline of its own to keep: it fades over the wider `shadow` band,
      // so it thins out well before the edge instead of ending along it
      const shade = f.shadow && d[i + 3] < 252 ? 1 - smooth(8, 24, Math.max(d[i], d[i + 1], d[i + 2])) : 0;
      const m = mask(x, y, f.width) * (1 - shade) + (shade && mask(x, y, f.shadow) * shade);
      if (m < 1) d[i + 3] = Math.round(d[i + 3] * m);
    }
  return d;
}

// One published frame as raw RGB: opaque = render over the sky; alpha = premultiplied RGB | alpha, 2w wide.
async function compose(file, w, h, film, skyBuf) {
  const src = sharp(file).resize(w, h, { fit: 'fill', kernel: 'lanczos3' }).ensureAlpha();
  if (!film.alpha)
    return sharp(skyBuf, { raw: { width: w, height: h, channels: 3 } }).composite([{ input: await src.png().toBuffer() }]).removeAlpha().raw().toBuffer();
  const d = feather(await src.raw().toBuffer(), w, h, film.feather), out = Buffer.alloc(2 * w * h * 3); // colour is premultiplied below, so it takes the feather too
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, a = d[i + 3], o = (y * 2 * w + x) * 3, r = o + w * 3;
      out[o] = Math.round((d[i] * a) / 255);
      out[o + 1] = Math.round((d[i + 1] * a) / 255);
      out[o + 2] = Math.round((d[i + 2] * a) / 255);
      out[r] = out[r + 1] = out[r + 2] = a;
    }
  return out;
}

// What the site shows: an opaque frame as is; a side-by-side frame laid over the section colour.
function onPage(buf, w, h, film) {
  if (!film.alpha) return buf;
  const bg = rgb(hex(film.bg)), out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * 2 * w + x) * 3, a = buf[o + w * 3] / 255;
      for (let c = 0; c < 3; c++) out[(y * w + x) * 3 + c] = Math.min(255, Math.round(buf[o + c] + bg[c] * (1 - a)));
    }
  return out;
}

async function montage(tiles, w, h, file, cell) {
  const cols = w >= h ? 4 : 6, cw = cell ?? (w >= h ? 480 : 300), ch = Math.round((cw * h) / w), gap = 6;
  const rows = Math.ceil(tiles.length / cols);
  const inputs = await Promise.all(tiles.map(async (t, i) => ({
    input: await sharp(t, { raw: { width: w, height: h, channels: 3 } }).resize(cw, ch).png().toBuffer(),
    left: gap + (i % cols) * (cw + gap), top: gap + Math.floor(i / cols) * (ch + gap),
  })));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await sharp({ create: { width: gap + cols * (cw + gap), height: gap + rows * (ch + gap), channels: 3, background: '#777777' } })
    .composite(inputs).png().toFile(file);
  return file;
}

const rawFrame = (scene, set, i) => path.join(RAW, scene, set, `f${pad(i)}.png`);

async function sizeOf(scene, film, set) {
  const first = rawFrame(scene, set.from, 0);
  if (!fs.existsSync(first)) die(`${first} is missing: render the scene first (npm run film)`);
  const m = await sharp(first).metadata(), native = film.sets.find((s) => s.id === set.from);
  return { w: even((m.width * set.w) / native.w), h: even((m.height * set.h) / native.h) };
}

function ffmpeg(args, opts = {}) {
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...args], { maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0) die(`ffmpeg failed: ${r.stderr}`);
  return r;
}

// Same flags as scripts/render-fallbacks.mjs encode(): every frame a keyframe, bt709 limited range, faststart.
function h264(dir, out, crf) {
  ffmpeg(['-framerate', String(FPS), '-i', path.join(dir, '%04d.png'),
    // accurate_rnd: without it swscale lands flat --cream one chroma step off (decodes #f8eeea, not #f6efea)
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-preset', 'slow',
    '-profile:v', 'high', '-crf', String(crf), '-g', '1', '-keyint_min', '1', '-sc_threshold', '0', '-bf', '0',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-movflags', '+faststart', '-an', out]);
  return fs.statSync(out).size;
}

async function encodeSet(scene, film, set) {
  const { w, h } = await sizeOf(scene, film, set), vw = film.alpha ? 2 * w : w;
  const dir = path.join(TMP, `${scene}-${set.id}`), keyDir = path.join(OUT, scene, 'keys');
  fs.rmSync(dir, { recursive: true, force: true });
  for (const d of [dir, keyDir]) fs.mkdirSync(d, { recursive: true });
  const skyBuf = film.alpha ? null : sky(w, h);
  for (let i = 0; i < film.frames; i++) {
    const file = rawFrame(scene, set.from, i);
    if (!fs.existsSync(file)) die(`${file} is missing (${scene} needs ${film.frames} frames)`);
    const buf = await compose(file, w, h, film, skyBuf);
    await sharp(buf, { raw: { width: vw, height: h, channels: 3 } }).png({ compressionLevel: 1 }).toFile(path.join(dir, `${pad(i)}.png`));
    if (film.keys.includes(i)) {
      const key = film.alpha
        ? sharp(feather(await sharp(file).resize(w, h, { fit: 'fill' }).ensureAlpha().raw().toBuffer(), w, h, film.feather), { raw: { width: w, height: h, channels: 4 } })
        : sharp(buf, { raw: { width: w, height: h, channels: 3 } });
      await key.webp({ quality: 82, alphaQuality: 90, effort: 5 }).toFile(path.join(keyDir, `${set.id}-${pad(i)}.webp`));
    }
  }
  // Lowest CRF from 18 that fits the ceiling (size falls as CRF rises).
  const out = path.join(OUT, scene, `${set.id}.mp4`), cap = set.max * 0.97;
  let crf = 18, bytes = h264(dir, out, crf);
  if (bytes > cap) {
    let lo = 18, hi = 36;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (h264(dir, out, mid) > cap) lo = mid;
      else hi = mid;
    }
    crf = hi;
    bytes = h264(dir, out, crf);
    if (bytes > cap) die(`${scene}/${set.id}.mp4 is ${bytes} bytes even at CRF ${crf}`);
  }
  // Decode check: frame count, size, and a contact sheet of every 10th frame as the site will show it.
  const probe = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
    'stream=nb_read_frames,width,height', '-of', 'csv=p=0', out], { encoding: 'utf8' });
  const [pw, ph, n] = probe.stdout.trim().split(',').map(Number);
  if (n !== film.frames || pw !== vw || ph !== h) die(`${out}: ${n} frames ${pw}x${ph}, expected ${film.frames} ${vw}x${h}`);
  const dec = ffmpeg(['-i', out, '-vf', `select=not(mod(n\\,10))+eq(n\\,${film.frames - 1}),scale=in_color_matrix=bt709:in_range=tv:out_range=pc,format=rgb24`,
    '-fps_mode', 'passthrough', '-f', 'rawvideo', '-']).stdout;
  const size = vw * h * 3, tiles = [], len = (e) => (e === 'l' || e === 'r' ? h : w);
  let worst = 0; // highest mean matte along a feathered edge, 0..255
  for (let o = 0; o + size <= dec.length; o += size) {
    const fr = dec.subarray(o, o + size), al = (x, y) => fr[(y * vw + w + x) * 3]; // the decoded matte
    // a feathered edge really is clear after H.264: no step along the line (its mean), only stray coding noise
    for (const [e, at] of [['l', (k) => al(0, k)], ['r', (k) => al(w - 1, k)], ['t', (k) => al(k, 0)], ['b', (k) => al(k, h - 1)]])
      if (film.feather?.edges.includes(e)) {
        let sum = 0, top = 0;
        for (let k = 0; k < len(e); k++) sum += at(k), top = Math.max(top, at(k));
        worst = Math.max(worst, sum / len(e));
        if (sum / len(e) > 3 || top > 24) die(`${out}: matte on the ${e} edge of sheet frame ${o / size} averages ${(sum / len(e)).toFixed(1)}, peaks at ${top}`);
      }
    tiles.push(onPage(fr, w, h, film));
  }
  const sheet = await montage(tiles, w, h, path.join(SHEETS, `${scene}-${set.id}.png`));
  const c = tiles[0].subarray(0, 3); // top-left pixel of frame 0 as decoded
  return { id: set.id, w, h, crf, bytes, max: set.max, sheet,
    corner: `#${[...c].map((v) => v.toString(16).padStart(2, '0')).join('')}${film.feather ? `, edge matte <= ${worst.toFixed(1)}/255` : ''}` };
}

async function film(scene) {
  const f = FILMS[scene], metaFile = path.join(RAW, scene, 'meta.json');
  const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')) : {};
  const rows = [], sets = [];
  for (const set of f.sets) {
    const r = await encodeSet(scene, f, set);
    rows.push(r);
    sets.push({ id: set.id, aspect: set.aspect, w: r.w, h: r.h, focus: set.focus, ...meta[set.id] });
  }
  fs.copyFileSync(rows[0].sheet, path.join(SHEETS, `${scene}.png`));
  const manifest = { scene, frames: f.frames, fps: FPS, alpha: f.alpha, sets, keys: f.keys, beats: f.beats };
  fs.writeFileSync(path.join(OUT, scene, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return rows.map((r) => ({ film: `${scene}/${r.id}.mp4`, size: `${r.w}x${r.h}`, frames: f.frames, crf: r.crf,
    bytes: r.bytes, ceiling: r.max, ok: r.bytes <= r.max, corner: r.corner }));
}

// Still-lifes: raw/stills/<name>/f0000.png (and <name>-fg) -> public/film/stills/<name>.webp, long edge 1600, <= 150 KB.
async function stills() {
  const dir = path.join(RAW, 'stills'), out = path.join(OUT, 'stills'), rows = [], tiles = [];
  if (!fs.existsSync(dir)) die(`${dir} is missing: render blender/film/stills.py first`);
  fs.mkdirSync(out, { recursive: true });
  const plum = rgb(hex('plum-ink')), tint = rgb(hex('peach-glow')).map((c, i) => plum[i] + (c - plum[i]) * SHADOW.warm);
  for (const name of fs.readdirSync(dir).filter((n) => fs.existsSync(path.join(dir, n, 'f0000.png'))).sort()) {
    const src = path.join(dir, name, 'f0000.png'), m = await sharp(src).metadata();
    const k = Math.min(1, STILL_EDGE / Math.max(m.width, m.height)), w = Math.round(m.width * k), h = Math.round(m.height * k);
    // The page under each still is a shadow catcher: its shadow arrives as black in the alpha, and runs as far as the
    // light throws it. Keep it as a light, warm contact shadow: tinted, thinned, gone within SHADOW.reach of the object
    // and before the frame's edge. Only black, not-quite-opaque pixels are shadow; the objects are untouched.
    const data = await sharp(src).resize(w, h).ensureAlpha().raw().toBuffer();
    const shade = new Float32Array(w * h), dist = new Float32Array(w * h).fill(1e9); // dist: to the object, 3-4 chamfer
    const box = [w, h, 0, 0];
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      shade[p] = data[i + 3] >= 252 ? 0 : 1 - smooth(8, 24, Math.max(data[i], data[i + 1], data[i + 2]));
      if (!data[i + 3] || shade[p] > 0.5) continue;
      dist[p] = 0;
      const x = p % w, y = (p - x) / w;
      box[0] = Math.min(box[0], x), box[1] = Math.min(box[1], y), box[2] = Math.max(box[2], x), box[3] = Math.max(box[3], y);
    }
    for (const s of [1, -1]) // forward pass, then the same backwards
      for (let p = s > 0 ? 0 : w * h - 1; p >= 0 && p < w * h; p += s) {
        const x = p % w, y = (p - x) / w, row = y - s >= 0 && y - s < h;
        if (x - s >= 0 && x - s < w) dist[p] = Math.min(dist[p], dist[p - s] + 3, row ? dist[p - s * w - s] + 4 : 1e9);
        if (row) dist[p] = Math.min(dist[p], dist[p - s * w] + 3, x + s >= 0 && x + s < w ? dist[p - s * w + s] + 4 : 1e9);
      }
    const reach = 3 * SHADOW.reach * Math.max(w, h), clear = Math.ceil(SHADOW.margin * Math.min(w, h)), f = SHADOW.fade * Math.min(w, h);
    for (let p = 0, i = 0; p < w * h; p++, i += 4) {
      const x = p % w, y = (p - x) / w, border = Math.min(x, y, w - 1 - x, h - 1 - y);
      if (shade[p]) {
        const keep = SHADOW.keep * (1 - Math.min(1, dist[p] / reach)) ** 2 * smooth(clear, clear + f, border);
        for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[i + c] + shade[p] * tint[c]);
        data[i + 3] = Math.round(data[i + 3] * (1 - shade[p] * (1 - keep)));
      }
      if (border < clear && data[i + 3]) die(`still ${name}: pixel ${x},${y} is not clear, inside the ${clear} px margin`);
    }
    const fill = `${(((box[2] - box[0] + 1) / w) * 100).toFixed(0)}x${(((box[3] - box[1] + 1) / h) * 100).toFixed(0)}%`;
    let q = 88, buf;
    do {
      buf = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).webp({ quality: q, alphaQuality: 85, effort: 6 }).toBuffer();
      q -= 6;
    } while (buf.length > STILL_MAX && q > 30);
    if (buf.length > STILL_MAX) die(`still ${name} is ${buf.length} bytes at quality ${q + 6}`);
    fs.writeFileSync(path.join(out, `${name}.webp`), buf);
    await sharp(buf).metadata(); // decodes
    rows.push({ film: `stills/${name}.webp`, size: `${w}x${h}`, frames: 1, crf: `q${q + 6}`, bytes: buf.length, ceiling: STILL_MAX, ok: true, corner: `fills ${fill}` });
    // the sheet shows each still as the page does, on both of its backgrounds, to the frame's very edge
    for (const bg of ['cream', 'paper'])
      tiles.push(await sharp(buf).flatten({ background: hex(bg) }).resize(1200, 900, { fit: 'contain', background: '#777777' }).removeAlpha().raw().toBuffer());
  }
  if (tiles.length) await montage(tiles, 1200, 900, path.join(SHEETS, 'stills.png'), 800);
  return rows;
}

// Look-dev: --look scene:set:f,f,f composites raw frames exactly as the encoder would, into one montage.
async function look(spec) {
  const [scene, sid, list] = spec.split(':'), f = FILMS[scene], set = f.sets.find((s) => s.id === sid);
  const { w, h } = await sizeOf(scene, f, set), skyBuf = f.alpha ? null : sky(w, h), tiles = [];
  for (const i of list.split(',').map(Number)) tiles.push(onPage(await compose(rawFrame(scene, set.from, i), w, h, f, skyBuf), w, h, f));
  console.log(await montage(tiles, w, h, path.join(SHEETS, `look-${scene}-${sid}.png`), w >= h ? 640 : 400));
}

if (arg('look')) await look(arg('look'));
else {
  if (spawnSync('ffmpeg', ['-version']).error) die('ffmpeg not found on PATH');
  const rows = [];
  for (const scene of arg('scenes', 'seed,weave,lotus,stills').split(',')) {
    if (scene === 'stills') rows.push(...(await stills()));
    else if (FILMS[scene]) rows.push(...(await film(scene)));
    else die(`unknown scene ${scene}`);
  }
  console.table(rows);
  if (rows.some((r) => !r.ok)) die('a file is over its ceiling');
}
