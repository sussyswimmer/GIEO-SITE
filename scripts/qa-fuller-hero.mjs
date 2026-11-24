// Hero and seam shots and checks (docs/08-fuller.md H0, H1, §5), against a running production server.
// Usage: node scripts/qa-fuller-hero.mjs [mode...]   with QA_BASE and QA_OUT in the environment to override
// modes: hero beats seam lcp reduced nojs   (default: all)
import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE = process.env.QA_BASE || 'http://localhost:3101';
const OUT = process.env.QA_OUT || 'qa/fuller/hero';
fs.mkdirSync(OUT, { recursive: true });
const modes = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const want = (m) => !modes.length || modes.includes(m);

const browser = await chromium.launch(
  // CHROME_PATH: any other machine (e.g. Linux Chromium). Default: Chrome on the Windows PC, on its GPU.
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] },
);

async function open(route, w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, ...opts });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await page.goto(BASE + route, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page };
}
const ready = async (page, motion = true) => {
  await page.waitForSelector('#hero [data-film][data-media="ready"]', { timeout: 20000 });
  if (motion) await page.waitForSelector('html[data-motion="on"]', { timeout: 20000 });
  await page.waitForTimeout(700);
};
const runOf = (page) => page.evaluate(() => document.querySelector('#hero').offsetHeight - innerHeight);
const scrollTo = async (page, y, settle = 1500) => {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(settle);
};

if (want('hero')) {
  for (const loc of ['en', 'vi'])
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      const { ctx, page } = await open(`/${loc}`, w, h);
      await ready(page);
      await page.screenshot({ path: `${OUT}/hero-${loc}-${w}x${h}.png` });
      console.log('hero', loc, w, h);
      await ctx.close();
    }
}

if (want('beats')) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { ctx, page } = await open('/en', w, h);
    await ready(page);
    const run = await runOf(page);
    // run share -> film frame (HERO_FILM in motion-runtime.ts): 0 until .1, 95 at .3 to .47, 149 from .76
    for (const [name, p] of [['f000', 0.05], ['f040', 0.184], ['f095', 0.38], ['f149', 0.79], ['sink', 0.92], ['end', 1]]) {
      await scrollTo(page, run * p, 2200);
      const frame = await page.evaluate(() => document.querySelector('#hero [data-film] canvas[data-frame]')?.dataset.frame ?? 'key');
      await page.screenshot({ path: `${OUT}/beat-${w}-${name}.png` });
      console.log('beat', w, name, 'frame', frame);
    }
    await ctx.close();
  }
}

if (want('seam')) {
  for (const [w, h] of [[390, 844], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]]) {
    const { ctx, page } = await open('/en', w, h);
    await ready(page);
    const run = await runOf(page);
    for (const [name, dy] of [['a', 0.3], ['b', 0.6], ['c', 0.95], ['d', 1.35]]) {
      await scrollTo(page, run + h * dy, 1800);
      await page.screenshot({ path: `${OUT}/seam-${w}-${name}.png` });
    }
    const info = await page.evaluate(() => {
      const yarn = document.querySelector('#craft [data-film]');
      const r = yarn.getBoundingClientRect();
      const d = document.querySelector('[data-thread-in]').getAttribute('d');
      return { yarnX: +(r.left + 0.535 * r.width).toFixed(1), threadIn: d, seam: yarn.style.getPropertyValue('--seam'), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
    });
    console.log('seam', w, JSON.stringify(info));
    await ctx.close();
  }
}

if (want('lcp')) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.__lcp = null;
      new PerformanceObserver((list) => {
        const e = list.getEntries().at(-1);
        const el = e.element;
        window.__lcp = {
          ms: Math.round(e.startTime),
          tag: el?.tagName,
          attrs: el ? [...el.attributes].filter((a) => a.name.startsWith('data-') || a.name === 'id').map((a) => a.name).join(' ') : '',
          h1: el?.closest('h1')?.id ?? null,
          text: (el?.textContent ?? '').trim().slice(0, 40),
          size: Math.round(e.size),
        };
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    for (const loc of ['en', 'vi']) {
      await page.goto(`${BASE}/${loc}`, { waitUntil: 'load' });
      await page.waitForSelector('#hero [data-film][data-media="ready"]', { timeout: 30000 });
      await page.waitForTimeout(4000); // past the vista, the film's first frame and the runtime's boot
      console.log('lcp', `${w}x${h}`, loc, '4x CPU', JSON.stringify(await page.evaluate(() => window.__lcp)));
    }
    await ctx.close();
  }
}

if (want('reduced')) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const { ctx, page } = await open('/en', w, h, { reducedMotion: 'reduce' });
    await page.waitForSelector('#hero [data-film][data-media="ready"]', { timeout: 20000 });
    await page.waitForTimeout(3500);
    // a reader scrolls: walk the hero once so the below-fold reveals fire, then go back to the top
    const total = await page.evaluate(() => document.querySelector('#hero').offsetHeight + innerHeight);
    for (let y = 0; y <= total; y += Math.round(h * 0.5)) await scrollTo(page, y, 350);
    await scrollTo(page, 0, 1200);
    const info = await page.evaluate(() => ({
      motion: document.documentElement.dataset.motion ?? null,
      sticky: [...document.querySelectorAll('#hero *')].filter((el) => getComputedStyle(el).position === 'sticky').length,
      hidden: [...document.querySelectorAll('#hero :is(h1, h2, p, a, span)')].filter((el) => el.textContent.trim() && !el.closest('[aria-hidden="true"]') && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })).map((el) => el.textContent.trim().slice(0, 30)),
      heroH: document.querySelector('#hero').offsetHeight,
    }));
    console.log('reduced', w, JSON.stringify(info));
    await page.screenshot({ path: `${OUT}/reduced-${w}.png`, clip: { x: 0, y: 0, width: w, height: Math.min(info.heroH + h * 0.8, 4000) }, fullPage: true });
    await ctx.close();
  }
}

if (want('nojs')) {
  const { ctx, page } = await open('/en', 1440, 900, { javaScriptEnabled: false });
  await page.waitForTimeout(500);
  const heroH = await page.locator('#hero').evaluate((el) => el.offsetHeight).catch(() => 1800);
  await page.screenshot({ path: `${OUT}/nojs-1440.png`, clip: { x: 0, y: 0, width: 1440, height: Math.min(heroH + 700, 4000) }, fullPage: true });
  console.log('nojs heroH', heroH);
  await ctx.close();
}

await browser.close();
