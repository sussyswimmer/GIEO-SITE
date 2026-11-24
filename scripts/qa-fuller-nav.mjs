// Navigation walk (docs/08 §4, last bullet). From the home page at the top and from about 40 % down,
// click every nav link (the desktop pill; on a phone the menu is opened first) and every footer link.
// The new page must start at the top with its h1 on screen, scroll with the wheel, and be marked current
// in the nav; Back must return home and Forward to the page.
// Usage (repo root): node scripts/qa-fuller-nav.mjs [--base http://localhost:3101] [--locale en]
import { chromium } from 'playwright';

const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i !== -1 ? process.argv[i + 1] : d; };
const BASE = arg('base', 'http://localhost:3101');
const LOCALE = arg('locale', 'en');
const PAGES = ['collections', 'about', 'get-involved', 'contact'];
const SIZES = [[1440, 900], [390, 844]];

const browser = await chromium.launch(
  // CHROME_PATH: any other machine (e.g. Linux Chromium). Default: Chrome on the Windows PC, on its GPU.
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] },
);
let failed = 0;

for (const [w, h] of SIZES) {
  for (const from of ['top', 'mid']) {
    for (const via of ['nav', 'footer']) {
      for (const name of PAGES) {
        const page = await browser.newPage({ viewport: { width: w, height: h } });
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        const home = `${BASE}/${LOCALE}`;
        // the default locale's links carry no prefix (src/i18n/routing.ts, localePrefix 'as-needed')
        const href = LOCALE === 'vi' ? `/${name}` : `/${LOCALE}/${name}`;
        await page.goto(home, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => 'motionReady' in document.documentElement.dataset, null, { timeout: 10000 }).catch(() => {});
        await page.mouse.move(w / 2, h / 2);

        let startY = 0;
        if (from === 'mid') {
          const target = await page.evaluate(() => Math.round((document.documentElement.scrollHeight - innerHeight) * 0.4));
          for (let i = 0; i < 80 && (await page.evaluate(() => scrollY)) < target; i++) {
            await page.mouse.wheel(0, 700);
            await page.waitForTimeout(120);
          }
          await page.waitForTimeout(900);
          // The pill hides on the way down; a reader brings it back by scrolling up a little.
          if (via === 'nav') {
            await page.mouse.wheel(0, -160);
            await page.waitForTimeout(1200);
          }
          startY = await page.evaluate(() => Math.round(scrollY));
        }

        if (via === 'nav') {
          if (w < 1024) {
            await page.click('header button[aria-controls="nav-menu"]');
            await page.click(`#nav-menu a[href="${href}"]`);
          } else {
            await page.click(`header nav > ul a[href="${href}"]`);
          }
        } else {
          await page.click(`body > footer a[href="${href}"]`);
        }
        await page.waitForURL(`**${href}`, { timeout: 10000 });
        await page.waitForSelector('main h1');
        await page.waitForTimeout(900);

        const r = await page.evaluate((hr) => {
          const h1 = document.querySelector('main h1');
          const b = h1.getBoundingClientRect();
          const s = getComputedStyle(h1);
          const current = document.querySelector('body > header a[aria-current="page"]');
          return {
            y: Math.round(scrollY),
            h1: b.height > 0 && b.top >= 0 && b.top < innerHeight && s.visibility === 'visible' && +s.opacity > 0.9,
            current: current?.getAttribute('href') === hr,
          };
        }, href);
        await page.mouse.move(w / 2, h / 2);
        await page.mouse.wheel(0, 600);
        await page.waitForTimeout(1300);
        const wheelY = await page.evaluate(() => Math.round(scrollY));

        await page.goBack();
        await page.waitForURL((u) => u.pathname === `/${LOCALE}`, { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(700);
        const back = await page.evaluate((l) => location.pathname === `/${l}` && !!document.querySelector('#hero h1'), LOCALE);
        await page.goForward();
        await page.waitForURL(`**${href}`, { timeout: 10000 }).catch(() => {});
        await page.waitForTimeout(700);
        const forward = await page.evaluate((hr) => location.pathname === hr && !!document.querySelector('main h1'), href);

        const ok = r.y === 0 && r.h1 && r.current && wheelY > 100 && back && forward && !errors.length;
        if (!ok) failed++;
        console.log(
          `${ok ? 'PASS' : 'FAIL'}  ${w}x${h}  from ${from}${from === 'mid' ? ` (y=${startY})` : ''}  ${via.padEnd(6)} -> ${href.padEnd(18)} ` +
            `scrollY=${r.y}  h1 visible=${r.h1}  aria-current=${r.current}  wheel moved to ${wheelY}  back=${back}  forward=${forward}` +
            (errors.length ? `  errors: ${errors.join(' | ')}` : ''),
        );
        await page.close();
      }
    }
  }
}
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall navigation checks passed');
process.exit(failed ? 1 : 0);
