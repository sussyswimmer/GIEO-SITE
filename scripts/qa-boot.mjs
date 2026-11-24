// Long tasks after page load, at 4x CPU throttle: the motion runtime's start-up must stay time-sliced
// (PROGRESS 2026-11-24; it used to hold the main thread 400 to 900 ms in one task on a phone).
// Waits for data-motion-ready (every boot step has run), then lists each long task after load.
// Usage: node scripts/qa-boot.mjs [--base http://localhost:3101] [--limit 150]
// The limit is loose on purpose: headless Chromium draws WebGL in software, so the hero film's first
// frame upload (about 80 to 110 ms here) is far slower than on a phone GPU and lands in this window.
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('base', 'http://localhost:3101').replace(/\/+$/, '');
const limit = Number(arg('limit', '150'));
const CASES = [
  [412, 823, '/'],
  [412, 823, '/en'],
  [412, 823, '/about'],
  [412, 823, '/en/collections'],
  [1440, 900, '/'],
];

const browser = await chromium.launch(
  process.env.CHROME_PATH || process.platform === 'linux' ? { executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' } : { channel: 'chrome' },
);
let failed = 0;
for (const [w, h, route] of CASES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: route.startsWith('/en') ? 'en-US' : 'vi-VN' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(() => {
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({
      type: 'longtask',
      buffered: true,
    });
  });
  await page.goto(base + route, { waitUntil: 'load' });
  const ready = await page
    .waitForFunction(() => 'motionReady' in document.documentElement.dataset, null, { timeout: 30000 })
    .then(() => true, () => false);
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => ({ long: window.__long, load: performance.getEntriesByType('navigation')[0].loadEventEnd }));
  const after = r.long.filter(([s]) => s > r.load);
  const worst = Math.max(0, ...after.map(([, d]) => d));
  const bad = !ready || worst > limit;
  if (bad) failed++;
  console.log(
    `${bad ? 'FAIL' : 'pass'} ${String(w).padEnd(4)} ${route.padEnd(16)} worst ${String(worst).padStart(4)} ms  ` +
      (ready ? '' : '[runtime never reported ready] ') +
      after.map(([s, d]) => `${d}@${s}`).join(' '),
  );
  await ctx.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
