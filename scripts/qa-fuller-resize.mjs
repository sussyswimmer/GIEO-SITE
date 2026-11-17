// Hero film after a window resize (src/lib/film-stage.ts: the vista's crop, the set swap on an orientation flip),
// against a running production server. Usage: node scripts/qa-fuller-resize.mjs   with QA_BASE and QA_OUT to override
// Cases: a) 1440x900 -> 1920x900 b) 1920x1080 -> 960x1000 c) 768x1024 -> 1024x768. One PASS/FAIL line each; exit 1 on any FAIL.
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.QA_BASE || 'http://localhost:3101';
const OUT = process.env.QA_OUT || 'qa/fuller/resize';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function open(route, w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await page.goto(BASE + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForSelector('#hero [data-film][data-media="ready"]', { timeout: 20000 });
  await page.waitForSelector('html[data-motion="on"]', { timeout: 20000 });
  await page.waitForTimeout(2500); // the video's first frame
  return { ctx, page };
}

// The left 100 CSS px of the hero canvas, at mid-height, read from the canvas itself (copy and nav are not on it).
// The canvas is cover-fitted into its box about the set's focus, so the visible part is worked out the way the CSS does.
const strip = (page) =>
  page.evaluate(() => {
    const stage = document.querySelector('#hero [data-film]');
    const c = stage.querySelector('canvas[data-frame]') ?? stage.querySelector('canvas');
    const probe = Object.assign(document.createElement('i'), { style: 'color: var(--cream)' });
    document.body.append(probe);
    const cream = getComputedStyle(probe).color.match(/\d+/g).slice(0, 3).map(Number);
    probe.remove();
    const [fx, fy] = stage.dataset.focus.split(',').map(Number);
    const s = Math.max(c.clientWidth / c.width, c.clientHeight / c.height);
    const vw = c.clientWidth / s;
    const vh = c.clientHeight / s;
    const sw = Math.max(1, Math.round(100 / s));
    const px = c.getContext('2d').getImageData(Math.round((c.width - vw) * fx), Math.round((c.height - vh) * fy + vh / 2 - 10), sw, 20).data;
    let worst = 0;
    for (let i = 0; i < px.length; i += 4) for (let k = 0; k < 3; k++) worst = Math.max(worst, Math.abs(px[i + k] - cream[k]));
    return { flat: worst <= 6, worst };
  });

const state = (page) =>
  page.evaluate(() => {
    const stage = document.querySelector('#hero [data-film]');
    const [w, h] = stage.dataset.size.split(',').map(Number);
    const b = document.querySelector('#hero [data-hero-beats]').getBoundingClientRect();
    return { set: stage.dataset.set, portrait: h > w, beatsW: Math.round(b.width), beatsH: Math.round(b.height) };
  });

const resize = async (page, w, h) => {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(1500); // the observer's debounce, the repaint or reload, the runtime's refresh
};

// Waits for data-set to change, then for the page thread (gieo:film -> safe()) to catch up.
const swapped = async (page, before) => {
  await page.waitForFunction((b) => document.querySelector('#hero [data-film]').dataset.set !== b, before, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  return state(page);
};

let failed = false;
const report = (name, ok, detail) => {
  console.log(ok ? 'PASS' : 'FAIL', name, detail);
  if (!ok) failed = true;
};

{
  const { ctx, page } = await open('/en', 1440, 900);
  const before = await strip(page);
  await page.screenshot({ path: `${OUT}/a-before-1440x900.png` });
  await resize(page, 1920, 900);
  const after = await strip(page);
  await page.screenshot({ path: `${OUT}/a-after-1920x900.png` });
  report('a vista crop 1440x900 -> 1920x900', !(after.flat && !before.flat), `before flat=${before.flat} (${before.worst}), after flat=${after.flat} (${after.worst})`);
  await ctx.close();
}

{
  const { ctx, page } = await open('/en', 1920, 1080);
  const before = await state(page);
  await resize(page, 960, 1000);
  const after = await swapped(page, before.set);
  report('b set swap 1920x1080 -> 960x1000', after.set !== before.set && after.portrait && after.beatsW >= 400, `set ${before.set} -> ${after.set}, portrait=${after.portrait}, beats ${after.beatsW}x${after.beatsH}`);
  await ctx.close();
}

{
  const { ctx, page } = await open('/en', 768, 1024);
  const before = await state(page);
  await resize(page, 1024, 768);
  const after = await swapped(page, before.set);
  report('c set swap 768x1024 -> 1024x768', after.set !== before.set && !after.portrait && after.beatsH >= 200, `set ${before.set} -> ${after.set}, portrait=${after.portrait}, beats ${after.beatsW}x${after.beatsH}`);
  await ctx.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
