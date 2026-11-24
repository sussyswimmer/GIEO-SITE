// Phase 7: Lighthouse over every public route, mobile (the budget's form factor) and desktop.
// Budgets: docs/03-motion-and-3d.md §7 (Performance ≥ 85; Accessibility, Best Practices, SEO ≥ 95;
// LCP < 2.5 s; CLS < 0.05). Run against a production build (npm run build, npx next start -p 3101).
// Usage: node scripts/qa-lighthouse.mjs [--base http://localhost:3101] [--form mobile|desktop|both]
//        [--routes /,/en] [--runs 1] [--out qa/lighthouse] [--chrome <path>]
import fs from 'node:fs';
import path from 'node:path';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('base', 'http://localhost:3101').replace(/\/+$/, '');
const form = arg('form', 'both');
const runs = Number(arg('runs', '1'));
const out = arg('out', 'qa/lighthouse');
const chromePath = arg('chrome', process.env.CHROME_PATH || '/opt/pw-browsers/chromium');
const ALL = ['/', '/about', '/collections', '/get-involved', '/contact'].flatMap((p) => [p, p === '/' ? '/en' : `/en${p}`]);
const routes = arg('routes', '') ? arg('routes').split(',') : ALL;
const forms = form === 'both' ? ['mobile', 'desktop'] : [form];
// 'simulate' (Lighthouse's default, Lantern) or 'devtools' (Chrome really throttles the link, so HTTP/2
// priorities apply; Lantern shares bandwidth evenly between the LCP image and lazy images below it).
const throttling = arg('throttling', 'simulate');

const MIN = { performance: 85, accessibility: 95, 'best-practices': 95, seo: 95 };
const LCP_MS = 2500;
const CLS = 0.05;

fs.mkdirSync(out, { recursive: true });
const chrome = await chromeLauncher.launch({
  chromePath,
  chromeFlags: ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', ...(base.startsWith('https://localhost') ? ['--ignore-certificate-errors'] : [])],
});

const rows = [];
let failures = 0;
try {
  for (const f of forms) {
    for (const route of routes) {
      const results = [];
      for (let r = 0; r < runs; r++) {
        const config =
          f === 'desktop'
            ? (await import('lighthouse/core/config/desktop-config.js')).default
            : undefined; // default config is mobile: Moto G Power, slow 4G, 4x CPU
        // Lighthouse's Chrome asks for English, and the middleware follows the browser (TODO(lang)),
        // so a Vietnamese route would redirect to /en without this.
        const lang = route.startsWith('/en') ? 'en-US,en;q=0.9' : 'vi-VN,vi;q=0.9';
        const res = await lighthouse(
          base + route,
          { port: chrome.port, output: 'json', logLevel: 'error', throttlingMethod: throttling, extraHeaders: { 'Accept-Language': lang } },
          config,
        );
        results.push(res.lhr);
      }
      // Median run by performance score, so one noisy run does not decide.
      results.sort((a, b) => a.categories.performance.score - b.categories.performance.score);
      const lhr = results[Math.floor(results.length / 2)];
      if (lhr.runtimeError) {
        failures++;
        rows.push({ form: f, route, fails: [`page did not load: ${lhr.runtimeError.code}`] });
        console.log(`FAIL ${f.padEnd(7)} ${route.padEnd(17)} page did not load: ${lhr.runtimeError.code}`);
        continue;
      }
      const slug = `${f}${route.replace(/\//g, '_') || '_'}`;
      fs.writeFileSync(path.join(out, `${slug}.json`), JSON.stringify(lhr));
      const score = (k) => Math.round((lhr.categories[k]?.score ?? 0) * 100);
      const lcp = lhr.audits['largest-contentful-paint'].numericValue;
      const cls = lhr.audits['cumulative-layout-shift'].numericValue;
      const tbt = lhr.audits['total-blocking-time'].numericValue;
      const lcpEl = lhr.audits['lcp-breakdown-insight']?.details?.items?.find((i) => i.type === 'node')?.snippet ?? '';
      const fails = [];
      for (const [k, min] of Object.entries(MIN)) if (score(k) < min) fails.push(`${k} ${score(k)} < ${min}`);
      if (lcp >= LCP_MS) fails.push(`LCP ${Math.round(lcp)} ms`);
      if (cls >= CLS) fails.push(`CLS ${cls.toFixed(3)}`);
      // Failing audits in the three ≥95 categories, so a miss says what to fix.
      const failing = [];
      for (const k of ['accessibility', 'best-practices', 'seo']) {
        for (const ref of lhr.categories[k].auditRefs) {
          const a = lhr.audits[ref.id];
          if (ref.weight > 0 && a.score !== null && a.score < 1) failing.push(`${k}:${ref.id}`);
        }
      }
      const landed = lhr.finalDisplayedUrl.replace(base, '') || '/';
      if (landed !== route) fails.push(`landed on ${landed}`);
      if (fails.length) failures++;
      const row = {
        form: f,
        route,
        perf: score('performance'),
        a11y: score('accessibility'),
        bp: score('best-practices'),
        seo: score('seo'),
        lcp: Math.round(lcp),
        cls: Number(cls.toFixed(3)),
        tbt: Math.round(tbt),
        lcpEl: lcpEl.slice(0, 70),
        failing,
        fails,
      };
      rows.push(row);
      console.log(
        `${fails.length ? 'FAIL' : 'pass'} ${f.padEnd(7)} ${route.padEnd(17)} P${row.perf} A${row.a11y} BP${row.bp} SEO${row.seo} LCP ${row.lcp}ms CLS ${row.cls} TBT ${row.tbt}ms` +
          (fails.length ? `  [${fails.join('; ')}]` : '') +
          (failing.length ? `\n      audits: ${failing.join(', ')}` : ''),
      );
    }
  }
} finally {
  await chrome.kill();
}
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(rows, null, 2));
console.log(`\n${rows.length - failures} of ${rows.length} within budget. Reports: ${out}/`);
process.exit(failures ? 1 : 0);
