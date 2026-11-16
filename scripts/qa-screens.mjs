// Screenshot + layout QA for a running site.
// Usage: node scripts/qa-screens.mjs --base http://localhost:3101 --routes /,/en --widths 375,1440 --out qa/phase1
// Writes <out>/<route-slug>@<width>.png per route x width and <out>/report.json.
// Exits 1 on console errors, uncaught page errors, or failed navigations.
// Horizontal overflow and text overflow are recorded in report.json, not treated as errors.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const base = arg('base', 'http://localhost:3101').replace(/\/+$/, '');
const routes = arg('routes', '/').split(',').map((r) => r.trim()).filter(Boolean);
const widths = arg('widths', '375,1440').split(',').map((w) => Number(w.trim())).filter(Boolean);
const outDir = path.resolve(arg('out', 'qa/screens'));
const settleMs = Number(arg('settle', '800'));

fs.mkdirSync(outDir, { recursive: true });

// Prefer the user's installed Chrome. Fall back to a cached Playwright build; never download.
async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome' });
  } catch (err) {
    console.warn(`[qa] Chrome channel failed: ${err.message.split('\n')[0]}`);
  }
  const cacheRoot = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'ms-playwright');
  if (fs.existsSync(cacheRoot)) {
    const dirs = fs.readdirSync(cacheRoot).filter((d) => d.startsWith('chromium-')).sort().reverse();
    for (const dir of dirs) {
      for (const sub of ['chrome-win64', 'chrome-win']) {
        const exe = path.join(cacheRoot, dir, sub, 'chrome.exe');
        if (fs.existsSync(exe)) {
          try {
            console.warn(`[qa] trying cached browser ${exe}`);
            return await chromium.launch({ executablePath: exe });
          } catch (err) {
            console.warn(`[qa] cached browser failed: ${err.message.split('\n')[0]}`);
          }
        }
      }
    }
  }
  throw new Error('No usable browser: install Google Chrome or set up a cached Playwright Chromium.');
}

const slugOf = (route) => route.replace(/^\/+|\/+$/g, '').replace(/[^A-Za-z0-9/_-]/g, '').replace(/\//g, '-') || 'home';

// Runs in the page. Finds text nodes whose rendered glyph boxes spill outside their element's box.
function findTextOverflow() {
  const out = [];
  const visible = (el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  for (const el of document.body.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const textNodes = [...el.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!textNodes.length) continue;
    const box = el.getBoundingClientRect();
    let spill = 0;
    for (const node of textNodes) {
      const range = document.createRange();
      range.selectNodeContents(node);
      for (const r of range.getClientRects()) {
        spill = Math.max(spill, r.right - box.right, box.left - r.left, r.bottom - box.bottom, box.top - r.top);
      }
    }
    if (spill > 1) {
      const text = textNodes.map((n) => n.textContent.trim()).join(' ').slice(0, 80);
      out.push({
        tag: el.tagName.toLowerCase(),
        class: (el.className && typeof el.className === 'string' ? el.className : '').slice(0, 80),
        text,
        spillPx: Math.round(spill),
      });
    }
    if (out.length >= 50) break;
  }
  return out;
}

const browser = await launchBrowser();
const results = [];
let errorCount = 0;

try {
  for (const route of routes) {
    for (const width of widths) {
      const url = base + route;
      const slug = slugOf(route);
      const file = `${slug}@${width}.png`;
      const entry = { route, width, url, screenshot: path.join(outDir, file), status: null,
        overflowX: null, textOverflow: [], consoleErrors: [], pageErrors: [], navigationError: null };

      // Browser language decides unprefixed routes (next-intl detection), so it must be VI to see VI.
      const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, locale: arg('locale', 'vi-VN') });
      const page = await context.newPage();
      page.on('console', (msg) => { if (msg.type() === 'error') entry.consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => entry.pageErrors.push(err.message));

      try {
        const response = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        entry.status = response ? response.status() : null;
        if (entry.status === null || entry.status >= 400) {
          entry.navigationError = `HTTP ${entry.status}`;
        }
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(settleMs);
        await page.evaluate(() => document.fonts.ready);
        // Line reveals fire on scroll: walk the page so the full-page capture shows every heading.
        await page.waitForSelector('html[data-tier]', { state: 'attached', timeout: 15000 });
        const scrollMax = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
        for (let y = 0; y <= scrollMax; y += 400) {
          await page.evaluate((v) => window.scrollTo(0, v), y);
          await page.waitForTimeout(120);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(1000);

        entry.overflowX = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflows: document.documentElement.scrollWidth > window.innerWidth,
        }));
        entry.textOverflow = await page.evaluate(findTextOverflow);
        await page.screenshot({ path: entry.screenshot, fullPage: true });
      } catch (err) {
        entry.navigationError = entry.navigationError || err.message.split('\n')[0];
      } finally {
        await context.close();
      }

      errorCount += entry.consoleErrors.length + entry.pageErrors.length + (entry.navigationError ? 1 : 0);
      results.push(entry);
      const flags = [
        entry.navigationError ? `ERROR ${entry.navigationError}` : 'ok',
        entry.overflowX?.overflows ? `x-overflow ${entry.overflowX.scrollWidth}>${entry.overflowX.innerWidth}` : null,
        entry.textOverflow.length ? `text-overflow ${entry.textOverflow.length}` : null,
        entry.consoleErrors.length ? `console-errors ${entry.consoleErrors.length}` : null,
        entry.pageErrors.length ? `page-errors ${entry.pageErrors.length}` : null,
      ].filter(Boolean).join(' | ');
      console.log(`[qa] ${route} @${width} -> ${file}: ${flags}`);
    }
  }
} finally {
  await browser.close();
}

const report = {
  base,
  generatedAt: new Date().toISOString(),
  routes,
  widths,
  summary: {
    pages: results.length,
    errors: errorCount,
    overflowX: results.filter((r) => r.overflowX?.overflows).map((r) => `${r.route}@${r.width}`),
    textOverflow: results.filter((r) => r.textOverflow.length).map((r) => `${r.route}@${r.width}`),
  },
  results,
};
fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
console.log(`[qa] report: ${path.join(outDir, 'report.json')}  errors=${errorCount}`);
process.exit(errorCount > 0 ? 1 : 0);
