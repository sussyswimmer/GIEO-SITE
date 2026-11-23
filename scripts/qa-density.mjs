// Density check and viewport walk (docs/07-redesign.md §2 and §5).
// Walks each route in 0.75-screen steps and saves one screenshot per step. Each step is then measured with
// decoration hidden (thread, stitches, kinetic band, glows, stage gradients, nav pill):
//   coverage = share of 8×8 px cells in which some pixel differs from its section's background colour by
//              ΔE > 6 (CIE76). Ink and imagery, not DOM boxes.
//   band     = tallest run of cell rows with no such cell, as a share of the viewport height.
// Pass = coverage >= 12 % (viewport >= 1024 wide) or 10 % (phones), and band <= 35 %, on every shot.
// Two page-level checks ride along: the page is at most 15.1 screens long (14.0 on phones), and no text in
// <main> is set under 14 px, nor under 16 px inside a <p>. The length is counted with the hero as one
// screen: the scroll its pinned film takes is not empty space. Both the raw and the counted length print.
// The cap is docs/09 F1's ("the page gets shorter"): no page may be longer than the home page was before
// GIEO's first feedback, which at da65345 counted 15.11 screens at 1440x900 and 14.00 at 390x844 in English.
// docs/07's cap of 12.0 / 12.5 had not held since docs/08 lengthened the product run (PROGRESS.md).
//
// Usage: node scripts/qa-density.mjs [--base http://localhost:3101] [--routes /en,/vi]
//          [--sizes 1440x900,390x844] [--out qa/redesign] [--reduced] [--films <dir>]
// --films serves /film/** from a folder instead of public/film, to check a render before it is copied in.
// Exit 1 when any shot fails.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const CELL = 8;
const DELTA_E = 6;

const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
function lab(r, g, b) {
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** px: raw RGB, w×h. bgAt(y) gives that row's section background as [r, g, b]. */
export function measure(px, w, h, bgAt) {
  const cols = Math.ceil(w / CELL);
  const rows = Math.ceil(h / CELL);
  const hit = new Uint8Array(cols * rows);
  for (let y = 0; y < h; y++) {
    const [br, bg, bb] = bgAt(y);
    const [L, A, B] = lab(br, bg, bb);
    const row = Math.floor(y / CELL) * cols;
    for (let x = 0; x < w; x++) {
      const cell = row + Math.floor(x / CELL);
      if (hit[cell]) continue;
      const i = (y * w + x) * 3;
      const r = px[i];
      const g = px[i + 1];
      const b = px[i + 2];
      if (Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb) < 6) continue; // far under ΔE 6
      const [l2, a2, b2] = lab(r, g, b);
      if (Math.hypot(l2 - L, a2 - A, b2 - B) > DELTA_E) hit[cell] = 1;
    }
  }
  let filled = 0;
  let run = 0;
  let band = 0;
  for (let r = 0; r < rows; r++) {
    let n = 0;
    for (let c = 0; c < cols; c++) n += hit[r * cols + c];
    filled += n;
    run = n ? 0 : run + 1;
    band = Math.max(band, run);
  }
  return { coverage: filled / (cols * rows), band: Math.min(1, (band * CELL) / h) };
}

export const limits = (w) => ({ coverage: w >= 1024 ? 0.12 : 0.1, band: 0.35, screens: w >= 1024 ? 15.1 : 14 });

// Runs in the page: text in <main> set smaller than the floor (14 px; 16 px inside a paragraph).
function smallType() {
  const seen = new Set();
  const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = node.parentElement;
    if (!node.textContent.trim() || !el.checkVisibility()) continue;
    const px = parseFloat(getComputedStyle(el).fontSize);
    const floor = el.closest('p') ? 16 : 14;
    if (px < floor - 0.01) seen.add(`${px}px (floor ${floor}) <${el.tagName.toLowerCase()}> "${node.textContent.trim().slice(0, 32)}"`);
  }
  return [...seen];
}

const QA_CSS = `
html.qa-density [data-ornament], html.qa-density [data-glow], html.qa-density [style*="--glow-"],
html.qa-density body > header, html.qa-density hr, html.qa-density .load-hairline,
html.qa-density .scene-stage::before { visibility: hidden !important; }
`;

const TYPES = { '.mp4': 'video/mp4', '.webp': 'image/webp', '.json': 'application/json' };

/** A Playwright route handler that serves /film/** from `dir`, with byte ranges: a video cannot seek without them. */
export const serveFilms = (dir) => (route) => {
  const file = path.join(dir, new URL(route.request().url()).pathname.slice('/film/'.length));
  if (!fs.existsSync(file)) return route.continue();
  const buf = fs.readFileSync(file);
  const range = /bytes=(\d+)-(\d*)/.exec(route.request().headers().range ?? '');
  const from = range ? +range[1] : 0;
  const to = range?.[2] ? +range[2] : buf.length - 1;
  return route.fulfill({
    status: range ? 206 : 200,
    body: buf.subarray(from, to + 1),
    headers: {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'accept-ranges': 'bytes',
      ...(range && { 'content-range': `bytes ${from}-${to}/${buf.length}` }),
    },
  });
};

// Runs in the page: each section's box and background colour, so a row knows what "empty" looks like.
function sectionTones() {
  const rgb = (s) => (s.match(/[\d.]+/g) ?? [247, 240, 234]).slice(0, 3).map(Number);
  const page = rgb(getComputedStyle(document.documentElement).backgroundColor);
  const sections = [...document.querySelectorAll('.section-bg')].map((bg) => {
    const r = bg.parentElement.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, rgb: rgb(getComputedStyle(bg).backgroundColor) };
  });
  return { page, sections };
}

// Runs in the page: every film stage in view has drawn, or has no manifest to draw.
function filmsReady() {
  return [...document.querySelectorAll('[data-film]')].every((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom < 0 || r.top > innerHeight || el.dataset.media;
  });
}

async function main() {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(`--${name}`);
    return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
  };
  const base = arg('base', 'http://localhost:3101').replace(/\/+$/, '');
  const routes = arg('routes', '/en,/vi').split(',');
  const sizes = arg('sizes', '1440x900,390x844').split(',').map((s) => s.split('x').map(Number));
  const out = path.resolve(arg('out', 'qa/redesign'));
  const reduced = process.argv.includes('--reduced');
  const films = arg('films', '');
  fs.mkdirSync(out, { recursive: true });

  const { chromium } = await import('playwright');
  const { default: sharp } = await import('sharp');
  const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const results = [];
  const pages = [];
  let failed = 0;

  for (const route of routes) {
    for (const [w, h] of sizes) {
      const page = await browser.newPage({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
      if (films) await page.route('**/film/**', serveFilms(films));
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.addStyleTag({ content: QA_CSS });
      await page.evaluate(() => document.fonts.ready);
      // motion boot: the runtime flags <html> once its triggers exist (the tier alone under reduced motion)
      await page
        .waitForFunction((r) => document.documentElement.dataset[r ? 'tier' : 'motion'], reduced, { timeout: 10000 })
        .catch(() => console.warn('  (motion never booted)'));
      await page.waitForTimeout(800);
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      const stops = [];
      for (let y = 0; y < total - h; y += Math.round(h * 0.75)) stops.push(y);
      stops.push(total - h); // the page end
      const slug = `${route.replace(/\W+/g, '') || 'home'}${reduced ? '-reduced' : ''}-w${w}`;
      const lim = limits(w);
      const small = await page.evaluate(smallType);
      // The hero's pinned run beyond its one screen does not count towards the length (0 where nothing pins).
      const run = await page.evaluate(() => {
        const pin = document.querySelector('[data-hero-pin]');
        return pin && getComputedStyle(pin).position === 'sticky' ? Math.max(0, document.querySelector('#hero').offsetHeight - innerHeight) : 0;
      });
      const counted = total - run;
      // The length budget is for the page as readers scroll it; without pins (reduced motion) it is shorter anyway.
      const long = !reduced && counted / h > lim.screens;
      if (long) failed++;
      failed += small.length;
      pages.push({ route, w, h, total, screens: +(total / h).toFixed(2), counted: +(counted / h).toFixed(2), shots: stops.length, small });
      console.log(
        `\n${route} ${w}x${h}${reduced ? ' (reduced motion)' : ''}: ${total}px = ${(total / h).toFixed(2)} screens raw, ${(counted / h).toFixed(2)} with the hero as one screen (limit ${lim.screens}) ${long ? 'FAIL' : 'ok'}, ${stops.length} shots`,
      );
      console.log(small.length ? small.map((s) => `  small type FAIL  ${s}`).join('\n') : '  type floor ok: nothing under 14 px, no paragraph under 16 px');
      for (const [i, y] of stops.entries()) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        await page
          .waitForFunction(filmsReady, null, { timeout: 8000 })
          .catch(() => console.warn('  (a film stage in view never reported data-media)'));
        await page.waitForTimeout(1300); // scrub settles
        const name = `${slug}-${String(i).padStart(2, '0')}.png`;
        await page.screenshot({ path: path.join(out, name) });
        await page.evaluate(() => document.documentElement.classList.add('qa-density'));
        const tones = await page.evaluate(sectionTones);
        const px = await sharp(await page.screenshot()).removeAlpha().raw().toBuffer();
        await page.evaluate(() => document.documentElement.classList.remove('qa-density'));
        const bgAt = (row) => tones.sections.findLast((s) => row >= s.top && row < s.bottom)?.rgb ?? tones.page;
        const m = measure(px, w, h, bgAt);
        const ok = m.coverage >= lim.coverage && m.band <= lim.band;
        if (!ok) failed++;
        results.push({ route, w, h, shot: name, y, ...m, ok });
        console.log(`  ${name}  y=${String(y).padStart(5)}  coverage ${(m.coverage * 100).toFixed(1).padStart(5)} %  band ${(m.band * 100).toFixed(0).padStart(3)} %  ${ok ? 'ok' : 'FAIL'}`);
      }
      await page.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(out, `density${reduced ? '-reduced' : ''}.json`), JSON.stringify({ pages, results }, null, 2));
  const worst = (key, pick) => results.reduce((x, r) => pick(x, r[key]), results[0]?.[key] ?? 0);
  const shotsFailed = results.filter((r) => !r.ok).length;
  console.log(
    `\ndensity: ${results.length - shotsFailed}/${results.length} shots pass; lowest coverage ${(worst('coverage', Math.min) * 100).toFixed(1)} %, tallest band ${(worst('band', Math.max) * 100).toFixed(0)} %; ${failed - shotsFailed} page-level failures (length, type floor)`,
  );
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
