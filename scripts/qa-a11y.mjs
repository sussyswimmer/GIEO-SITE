// Phase 7 accessibility walk (docs/05-build-plan.md): keyboard order, focus rings, alt text, decorative
// media hidden from assistive tech, heading outline, the mobile menu by keyboard. Lighthouse's axe audits
// cover contrast, names and ARIA; this covers what they cannot see. Run against a production build.
// Usage: node scripts/qa-a11y.mjs [--base http://localhost:3101] [--out qa/a11y] [--routes /,/en]
import fs from 'node:fs';
import { chromium } from 'playwright';

const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const base = arg('base', 'http://localhost:3101').replace(/\/+$/, '');
const out = arg('out', 'qa/a11y');
const ALL = ['/', '/about', '/collections', '/get-involved', '/contact'].flatMap((p) => [p, p === '/' ? '/en' : `/en${p}`]);
const routes = arg('routes', '') ? arg('routes').split(',') : ALL;
const SIZES = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
];
const MAX_TABS = 250;

fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium' });
const report = [];
let failed = 0;

// Static checks on the DOM, run once per page.
const staticChecks = () => {
  const issues = [];
  const lang = document.documentElement.lang;
  const want = location.pathname.startsWith('/en') ? 'en' : 'vi';
  if (lang !== want) issues.push(`html lang="${lang}", expected ${want}`);
  const h1 = document.querySelectorAll('h1');
  if (h1.length !== 1) issues.push(`${h1.length} h1 elements`);
  let prev = 0;
  for (const h of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    if (h.closest('[aria-hidden="true"]')) continue;
    const lvl = Number(h.tagName[1]);
    if (prev && lvl > prev + 1) issues.push(`heading skips h${prev} -> h${lvl}: "${h.textContent.trim().slice(0, 40)}"`);
    prev = lvl;
  }
  const hidden = (el) => !!el.closest('[aria-hidden="true"],[role="presentation"],[role="none"]');
  for (const img of document.querySelectorAll('img')) {
    if (!img.hasAttribute('alt')) issues.push(`img without alt: ${img.currentSrc || img.src}`);
  }
  for (const c of document.querySelectorAll('canvas')) if (!hidden(c)) issues.push('canvas not aria-hidden');
  for (const v of document.querySelectorAll('video')) {
    if (!hidden(v)) issues.push(`video not aria-hidden: ${v.currentSrc || v.src}`);
    if (v.controls === false && v.autoplay && !v.muted) issues.push('autoplaying video with sound');
  }
  for (const el of document.querySelectorAll('[tabindex]')) {
    if (Number(el.getAttribute('tabindex')) > 0) issues.push(`positive tabindex on <${el.tagName.toLowerCase()}>`);
  }
  // Focusable things inside aria-hidden trees are announced as nothing yet still take focus.
  for (const el of document.querySelectorAll('[aria-hidden="true"] a[href], [aria-hidden="true"] button, [aria-hidden="true"] input, [aria-hidden="true"] [tabindex="0"]')) {
    if (el.closest('[inert]') || el.getAttribute('tabindex') === '-1') continue;
    const r = el.getBoundingClientRect();
    if (r.width || r.height) issues.push(`focusable inside aria-hidden: <${el.tagName.toLowerCase()}> "${el.textContent.trim().slice(0, 30)}"`);
  }
  for (const a of document.querySelectorAll('a[href], button')) {
    if (hidden(a)) continue;
    const name = (a.getAttribute('aria-label') || a.textContent || a.querySelector('img')?.alt || '').trim();
    if (!name) issues.push(`unnamed <${a.tagName.toLowerCase()}> ${a.getAttribute('href') ?? ''}`);
  }
  const ids = {};
  for (const el of document.querySelectorAll('[id]')) ids[el.id] = (ids[el.id] || 0) + 1;
  for (const [id, n] of Object.entries(ids)) if (n > 1) issues.push(`duplicate id "${id}" x${n}`);
  return issues;
};

// What has focus, and whether a ring is visible on it.
const focusInfo = () => {
  const el = document.activeElement;
  if (!el || el === document.body) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const ring =
    (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
    (cs.boxShadow && cs.boxShadow !== 'none') ||
    // A ring drawn by a pseudo-element or a child (e.g. a card's frame).
    [':before', ':after'].some((p) => {
      const s = getComputedStyle(el, p);
      return s.content !== 'none' && ((s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none'));
    });
  const path = [];
  for (let n = el; n && n !== document.body; n = n.parentElement) path.unshift(n);
  return {
    tag: el.tagName.toLowerCase(),
    label: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('href') || '').trim().replace(/\s+/g, ' ').slice(0, 40),
    href: el.getAttribute('href'),
    ring,
    onScreen: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
    size: [Math.round(r.width), Math.round(r.height)],
    key: path.map((n) => n.tagName + Array.prototype.indexOf.call(n.parentElement?.children ?? [], n)).join('>'),
  };
};

for (const size of SIZES) {
  for (const route of routes) {
    const ctx = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      locale: route.startsWith('/en') ? 'en-US' : 'vi-VN',
      reducedMotion: 'no-preference',
    });
    const page = await ctx.newPage();
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const issues = await page.evaluate(staticChecks);

    // 1. The first Tab lands on the skip link, and following it puts focus in <main>.
    await page.keyboard.press('Tab');
    const first = await page.evaluate(focusInfo);
    if (!first || first.href !== '#main') issues.push(`first tab stop is ${first ? `${first.tag} "${first.label}"` : 'nothing'}, not the skip link`);
    else {
      if (!first.onScreen) issues.push('skip link not visible when focused');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const inMain = await page.evaluate(() => !!document.activeElement?.closest('main') || document.activeElement?.id === 'main');
      if (!inMain) issues.push('skip link does not move focus into main');
      await page.evaluate(() => document.activeElement?.blur());
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    // 2. Walk the whole page with Tab: every stop visible, ringed, on screen once focused, no trap.
    await page.goto(base + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    const stops = [];
    const seen = new Set();
    let wrapped = false;
    for (let i = 0; i < MAX_TABS; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(size.name === '390' ? 60 : 30);
      const f = await page.evaluate(focusInfo);
      if (!f) {
        wrapped = true; // back to the browser chrome / body: the end of the page
        break;
      }
      if (seen.has(f.key)) {
        wrapped = true;
        break;
      }
      seen.add(f.key);
      // Focus scrolls the page; give smooth scroll a moment before judging on-screen.
      if (!f.onScreen) {
        await page.waitForTimeout(400);
        Object.assign(f, await page.evaluate(focusInfo));
      }
      stops.push(f);
      if (!f.ring) issues.push(`no focus ring: ${f.tag} "${f.label}"`);
      if (!f.onScreen) issues.push(`focused but off screen: ${f.tag} "${f.label}"`);
      if (f.size[0] < 1 || f.size[1] < 1) issues.push(`zero-size focus stop: ${f.tag} "${f.label}"`);
    }
    if (!wrapped) issues.push(`no end after ${MAX_TABS} tabs (trap?)`);
    const hidden = await page.evaluate(() => {
      // Copy a sighted reader sees must be reachable; the reverse (links focusable but invisible) is the risk.
      const bad = [];
      for (const a of document.querySelectorAll('main a[href], footer a[href], nav a[href]')) {
        const cs = getComputedStyle(a);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        if (a.closest('[inert],[aria-hidden="true"]')) continue;
        if (a.tabIndex < 0) bad.push(a.textContent.trim().slice(0, 30));
      }
      return bad;
    });
    for (const h of hidden) issues.push(`visible link removed from tab order: "${h}"`);

    // 3. Phones: the menu opens with Enter, Escape closes it and returns focus to its button.
    if (size.name === '390') {
      const btn = page.locator('button[aria-expanded]').first();
      if (await btn.count()) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await btn.focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);
        const open = await btn.getAttribute('aria-expanded');
        if (open !== 'true') issues.push('menu button: Enter did not open the menu');
        await page.keyboard.press('Tab');
        const inMenu = await page.evaluate(focusInfo);
        if (!inMenu?.href) issues.push(`menu open: Tab went to ${inMenu ? inMenu.tag : 'nothing'}, not a menu link`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        if ((await btn.getAttribute('aria-expanded')) !== 'false') issues.push('menu: Escape did not close it');
        const back = await page.evaluate(() => document.activeElement?.getAttribute('aria-expanded') !== null);
        if (!back) issues.push('menu: focus not returned to the menu button after Escape');
      } else issues.push('no menu button found at 390');
    }

    await page.screenshot({ path: `${out}/${size.name}${route.replace(/\//g, '_') || '_'}-focus-last.png` });
    if (issues.length) failed++;
    report.push({ size: size.name, route, stops: stops.map((s) => `${s.tag}:${s.label}`), issues });
    console.log(`${issues.length ? 'FAIL' : 'pass'} ${size.name.padEnd(4)} ${route.padEnd(17)} ${String(stops.length).padStart(3)} tab stops` + (issues.length ? `\n      ${[...new Set(issues)].join('\n      ')}` : ''));
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(`\n${report.length - failed} of ${report.length} clean. Tab orders: ${out}/report.json`);
process.exit(failed ? 1 : 0);
