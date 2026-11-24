// Checks on the four sub-pages (docs/08-fuller.md §4, §5).
//   type:     the smallest computed font size of any p, li, small, label, input, textarea, a inside <main>,
//             per page and size, with every element under 16 px listed (those must be labels or captions,
//             and none may be under 14 px).
//   overflow: document.documentElement.scrollWidth against a 375 px viewport, /vi.
// Usage (repo root): node scripts/qa-fuller-pages.mjs [--base http://localhost:3101]
import { chromium } from 'playwright';

const i = process.argv.indexOf('--base');
const BASE = i !== -1 ? process.argv[i + 1] : 'http://localhost:3101';
const PAGES = ['collections', 'about', 'get-involved', 'contact'];
const browser = await chromium.launch(
  // CHROME_PATH: any other machine (e.g. Linux Chromium). Default: Chrome on the Windows PC, on its GPU.
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] },
);
let failed = 0;

console.log('TYPE: smallest computed font size in <main> (p, li, small, label, input, textarea, a)');
for (const [locale, w, h] of [['en', 1440, 900], ['en', 390, 844], ['vi', 390, 844]]) {
  for (const name of PAGES) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.goto(`${BASE}/${locale}/${name}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(() => {
      const els = [...document.querySelectorAll('main :is(p, li, small, label, input, textarea, a)')].filter(
        (el) => el.checkVisibility() && !el.closest('[aria-hidden="true"]'),
      );
      // The size a reader sees is that of the element holding the text, so read each text node's parent too.
      const sized = [];
      for (const el of els) {
        if (el.matches('input, textarea')) sized.push([el, parseFloat(getComputedStyle(el).fontSize)]);
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          if (n.textContent.trim() && n.parentElement.checkVisibility()) sized.push([n.parentElement, parseFloat(getComputedStyle(n.parentElement).fontSize), n.textContent.trim()]);
        }
      }
      const min = Math.min(...sized.map((s) => s[1]));
      const small = new Map();
      for (const [el, px, text] of sized) if (px < 16) small.set(`${px}px <${el.tagName.toLowerCase()}> "${(text ?? el.name ?? '').slice(0, 44)}"`, 1);
      return { count: sized.length, min, small: [...small.keys()] };
    });
    if (r.min < 14) failed++;
    console.log(`  /${locale}/${name} ${w}x${h}: min ${r.min}px over ${r.count} text runs${r.min < 14 ? '  FAIL (< 14)' : ''}`);
    for (const s of r.small) console.log(`      under 16 (label or caption): ${s}`);
    await page.close();
  }
}

console.log('\nOVERFLOW: scrollWidth at a 375 px viewport, /vi');
for (const name of PAGES) {
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  await page.goto(`${BASE}/vi/${name}`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => 'motionReady' in document.documentElement.dataset, null, { timeout: 10000 }).catch(() => {});
  // Walk the page so everything that enters on scroll has entered.
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 500) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(120);
  }
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  if (sw > 375) failed++;
  console.log(`  /vi/${name}: scrollWidth ${sw} vs 375  ${sw > 375 ? 'FAIL' : 'ok'}`);
  await page.close();
}
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall checks passed');
process.exit(failed ? 1 : 0);
