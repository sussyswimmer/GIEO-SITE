// Checks for docs/08-fuller.md H2 and H3 (the weave's pacing and the home page from the weave down),
// against a running production server.
//   pace      the scroll, in svh, for which each of tote, mug and coaster rests on the stage (its last
//             frame, the stage pinned), the scroll each change takes, and the three-product total
//   walk      screenshots from the weave section to the footer in 0.75-screen steps; per shot the ink
//             coverage and the tallest empty band (qa-density's measure, decoration hidden), and per page
//             the smallest font size of any p, li or small in <main>
//   contrast  text on the Vision / Mission picture against the darkest and the lightest pixel under it
//   reduced   the same walk under prefers-reduced-motion at 1440x900: nothing sticky, no copy hidden
//
// Usage: node scripts/qa-fuller-b.mjs <pace|walk|contrast|reduced|all> [--base http://localhost:3112] [--out qa/fuller/b]
// Exit 1 when a check fails.
import fs from 'node:fs';
import path from 'node:path';
import { measure } from './qa-density.mjs';

const what = process.argv[2] ?? 'all';
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const base = arg('base', 'http://localhost:3112').replace(/\/+$/, '');
const out = path.resolve(arg('out', 'qa/fuller/b'));
fs.mkdirSync(out, { recursive: true });
const DESKTOP = [1440, 900];
const PHONE = [390, 844];

const { chromium } = await import('playwright');
const { default: sharp } = await import('sharp');
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
let failed = 0;
const check = (ok, line) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${line}`);
};

async function open(route, [width, height], options = {}) {
  const page = await browser.newPage({ viewport: { width, height }, ...options });
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // the runtime flags <html> once its triggers exist (the tier alone under reduced motion)
  await page
    .waitForFunction((r) => document.documentElement.dataset[r ? 'tier' : 'motion'], options.reducedMotion === 'reduce', { timeout: 15000 })
    .catch(() => console.warn('  (motion never booted)'));
  await page.waitForTimeout(800);
  return page;
}
// every film stage in view has drawn, or has no manifest to draw
const filmsReady = () =>
  [...document.querySelectorAll('[data-film]')].every((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom < 0 || r.top > innerHeight || el.dataset.media;
  });

// ── pace ──────────────────────────────────────────────────────────────────────────────────────────
async function pace() {
  // each product's box in its key frame (left, top, right, bottom as shares of the canvas), as qa-redesign reads it
  const boxes = {};
  for (const f of [129, 149, 169]) {
    const box = (boxes[f] = [1, 1, 0, 0]);
    const { data, info } = await sharp(path.resolve('public/film/weave/keys', `s-0${f}.webp`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3, n = 0; i < data.length; i += 4, n++) {
      if (data[i] < 128) continue;
      const x = (n % info.width) / info.width;
      const y = Math.floor(n / info.width) / info.height;
      box.splice(0, 4, Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y));
    }
  }
  for (const size of [[1280, 720], [1366, 768], [1536, 864], DESKTOP, [1920, 1080], [1024, 768], PHONE]) {
    const [w, h] = size;
    const floor = w >= 1024 ? 210 : 150;
    const page = await open('/en?tier=full', size); // ?tier exposes the QA hook; full is what this PC picks anyway
    const span = await page.evaluate(() => {
      const r = document.querySelector('#craft').getBoundingClientRect();
      return [Math.round(r.top + scrollY - innerHeight), Math.round(r.bottom + scrollY)];
    });
    const step = h / 100; // 1svh
    const rows = [];
    for (let y = span[0]; y <= span[1]; y += step) {
      rows.push(
        await page.evaluate(async (yy) => {
          window.scrollTo(0, yy);
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
          const { ScrollTrigger, store, timeOf, TRACKS } = window.__gieoMotion;
          ScrollTrigger.update();
          // the scrub's damping is time, not scroll: finish it, so each row is where the film comes to rest
          ScrollTrigger.getAll().forEach((st) => st.animation?.totalProgress(st.progress));
          const film = document.querySelector('#craft [data-film]');
          const box = film.parentElement.getBoundingClientRect();
          // the canvas where it is drawn (translate and the sway's shift included), without the sway's rotation:
          // under a degree about its centre, but a rotated box reports a larger rectangle
          const c = film.getBoundingClientRect();
          const [fw, fh] = [film.offsetWidth, film.offsetHeight];
          return {
            film: [c.left + (c.width - fw) / 2, c.top + (c.height - fh) / 2, fw, fh],
            nav: document.querySelector('header nav, header')?.getBoundingClientRect().bottom ?? 0,
            y: yy,
            frame: Math.round(timeOf('weave', store.getState()) * (TRACKS.weave.frames - 1)),
            top: Math.round(box.top),
            onScreen: box.top >= -1 && box.bottom <= innerHeight + 1,
            lit: [...document.querySelectorAll('#craft ul[role="list"] > li')].map((li) => (li.dataset.active ? li.textContent : '')).join(''),
          };
        }, y),
      );
    }
    const svh = (px) => +(px / step).toFixed(1);
    // a product rests while the film is on its last frame and the stage is whole on screen and has not moved
    const rest = (frame) => rows.filter((r, i) => r.frame === frame && r.onScreen && rows[i - 1]?.top === r.top);
    const run = (rs) => (rs.length ? rs.at(-1).y - rs[0].y + step : 0);
    const between = (a, b) => run(rows.filter((r) => r.frame > a && r.frame < b)) + step;
    const names = { 129: 'tote', 149: 'mug', 169: 'coaster' };
    // the product is whole on screen (under the nav pill below 1280, where the stage does not bleed off the top)
    const whole = (r, f) => {
      const [l, t, cw, ch] = r.film;
      const b = boxes[f];
      return l + b[0] * cw >= 0 && l + b[2] * cw <= w && t + b[1] * ch >= (w >= 1280 ? 0 : r.nav) - 1 && t + b[3] * ch <= h + 1;
    };
    const span3 = (r, f) => `${Math.round(r.film[1] + boxes[f][1] * r.film[3])} to ${Math.round(r.film[1] + boxes[f][3] * r.film[3])} of ${h}`;
    console.log(`\npace ${w}x${h} (1svh = ${step}px, #craft is ${svh(span[1] - span[0] - h)}svh tall)`);
    const holds = [129, 149, 169].map((f) => rest(f));
    holds.forEach((rs, i) => {
      const f = [129, 149, 169][i];
      const lit = [...new Set(rs.map((r) => r.lit))].join('|');
      check(svh(run(rs)) >= 45, `${names[f].padEnd(8)} at rest on frame ${f} for ${svh(run(rs))}svh (floor 45), name lit: "${lit}"`);
      // whole for all of its rest, and whenever its name is lit (which starts half-way through the change before)
      // while the stage is held: once the section lets go, the stage and the names leave the screen together
      const shown = rows.filter((r) => r.onScreen && (r.frame === f || r.lit === rs[0]?.lit));
      const cut = shown.filter((r) => !whole(r, f));
      check(cut.length === 0, `${names[f].padEnd(8)} whole on screen at all ${shown.length} held positions where it rests or its name is lit${cut.length ? `: cut at ${cut.length}, e.g. y=${Math.round(cut[0].y)} product ${span3(cut[0], f)}` : ` (mid-rest: y ${span3(rs[Math.floor(rs.length / 2)] ?? shown[0], f)})`}`);
    });
    check(svh(between(109, 129)) <= 30, `cloth → tote takes ${svh(between(109, 129))}svh (ceiling 30)`);
    check(svh(between(129, 149)) <= 30, `tote → mug takes ${svh(between(129, 149))}svh (ceiling 30)`);
    check(svh(between(149, 169)) <= 30, `mug → coaster takes ${svh(between(149, 169))}svh (ceiling 30)`);
    const total = holds[2].at(-1).y - holds[0][0].y + step;
    check(svh(total) >= floor, `three products span ${svh(total)}svh, tote's first rest to the coaster's last (floor ${floor})`);

    // and what the canvas really draws mid-rest, in real time (scrub and seek left to settle)
    for (const [i, rs] of holds.entries()) {
      const mid = rs[Math.floor(rs.length / 2)].y;
      await page.evaluate((yy) => window.scrollTo(0, yy), mid);
      await page.waitForFunction(filmsReady, null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(1600);
      const drawn = await page.evaluate(() => Number(document.querySelector('[data-film="weave"] canvas[data-frame]')?.dataset.frame));
      const f = [129, 149, 169][i];
      const file = `pace-w${w}x${h}-${names[f]}.png`;
      await page.screenshot({ path: path.join(out, file) });
      const now = await page.evaluate(() => {
        const film = document.querySelector('#craft [data-film]');
        const c = film.getBoundingClientRect();
        const [fw, fh] = [film.offsetWidth, film.offsetHeight];
        return { film: [c.left + (c.width - fw) / 2, c.top + (c.height - fh) / 2, fw, fh], nav: document.querySelector('header nav, header')?.getBoundingClientRect().bottom ?? 0 };
      });
      check(drawn === f && whole(now, f), `canvas mid-rest draws frame ${drawn} (${names[f]}), product y ${span3(now, f)}, ${file}`);
    }
    await page.close();
  }
}

// ── walk ──────────────────────────────────────────────────────────────────────────────────────────
const QA_CSS = `
html.qa-density [data-ornament], html.qa-density [data-glow], html.qa-density [style*="--glow-"],
html.qa-density body > header, html.qa-density hr, html.qa-density .load-hairline,
html.qa-density .scene-stage::before { visibility: hidden !important; }
html.qa-density.qa-bands [data-band] { visibility: visible !important; }`;
function sectionTones() {
  const rgb = (s) => (s.match(/[\d.]+/g) ?? [247, 240, 234]).slice(0, 3).map(Number);
  const page = rgb(getComputedStyle(document.documentElement).backgroundColor);
  const sections = [...document.querySelectorAll('.section-bg')].map((bg) => {
    const r = bg.parentElement.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, rgb: rgb(getComputedStyle(bg).backgroundColor) };
  });
  return { page, sections };
}
function smallestType() {
  // from the weave down: the hero is another lane's
  const rows = [...document.querySelectorAll('main > :not(#hero) :is(p, li, small)')]
    .filter((el) => el.textContent.trim() && !el.closest('footer, #hero'))
    .map((el) => ({
      px: parseFloat(getComputedStyle(el).fontSize),
      what: `<${el.tagName.toLowerCase()}${el.hasAttribute('data-credit') ? ' data-credit' : ''}> "${el.textContent.trim().slice(0, 36)}"`,
    }))
    .sort((a, b) => a.px - b.px);
  return { smallest: rows[0], under16: rows.filter((r) => r.px < 16) };
}
function copyReport() {
  const copy = [...document.querySelectorAll('main :is(h1, h2, h3, p, li, dt, dd, blockquote, a, small, figcaption)')].filter(
    (el) => el.textContent.trim() && !el.closest('[aria-hidden="true"], [data-ornament]'),
  );
  const label = (el) => `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 30)}"`;
  return {
    count: copy.length,
    hidden: copy.filter((el) => !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })).map(label),
    sticky: [...document.querySelectorAll('main *')].filter((el) => getComputedStyle(el).position === 'sticky').map((el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '')),
    motion: document.documentElement.dataset.motion ?? null,
  };
}

async function walk(route, size, reduced = false) {
  const [w, h] = size;
  const page = await open(route, size, { reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.addStyleTag({ content: QA_CSS });
  const [from, total] = await page.evaluate(() => [Math.round(document.querySelector('#craft').getBoundingClientRect().top + scrollY), document.documentElement.scrollHeight]);
  const stops = [];
  for (let y = from; y < total - h; y += Math.round(h * 0.75)) stops.push(y);
  stops.push(total - h);
  const slug = `${route.replace(/\W+/g, '')}${reduced ? '-reduced' : ''}-w${w}`;
  // "no shot more than about a third blank": the tallest empty band, decoration hidden. Coverage is printed
  // against docs/08 §1's floor (20 % desktop, 16 % phone) and marked when under it, but does not fail the walk:
  // the Involve rows and the footer are kept as they are, and they sit under that floor.
  const lim = { coverage: w >= 1024 ? 0.2 : 0.16, band: 1 / 3 };
  console.log(`\nwalk ${route} ${w}x${h}${reduced ? ' (reduced motion)' : ''}: weave at y=${from}, page ${total}px, ${stops.length} shots`);
  const seen = { hidden: new Set(), sticky: new Set(), motion: null, count: 0 };
  for (const [i, y] of stops.entries()) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForFunction(filmsReady, null, { timeout: 8000 }).catch(() => console.warn('  (a film stage in view never reported data-media)'));
    await page.waitForTimeout(1400); // scrub settles
    const name = `${slug}-${String(i).padStart(2, '0')}.png`;
    await page.screenshot({ path: path.join(out, name) });
    await page.evaluate(() => document.documentElement.classList.add('qa-density'));
    const tones = await page.evaluate(sectionTones);
    const bgAt = (row) => tones.sections.findLast((s) => row >= s.top && row < s.bottom)?.rgb ?? tones.page;
    const shoot = async () => measure(await sharp(await page.screenshot()).removeAlpha().raw().toBuffer(), w, h, bgAt);
    let m = await shoot();
    let line = `${name}  y=${String(y).padStart(5)}  coverage ${(m.coverage * 100).toFixed(1).padStart(5)} %  empty band ${(m.band * 100).toFixed(0).padStart(3)} %`;
    if (m.band > lim.band) {
      // qa-density hides the sideways bands as decoration; they are a screen-wide line of type, so a shot
      // that is only "empty" where one runs is measured again with the bands showing, and both are printed
      await page.evaluate(() => document.documentElement.classList.add('qa-bands'));
      const strict = m.band;
      m = await shoot();
      await page.evaluate(() => document.documentElement.classList.remove('qa-bands'));
      line += `  [bands hidden: ${(strict * 100).toFixed(0)} %; as seen, with the sideways band: ${(m.band * 100).toFixed(0)} %]`;
    }
    await page.evaluate(() => document.documentElement.classList.remove('qa-density'));
    if (reduced) console.log(`      ${line}`);
    else check(m.band <= lim.band, `${line}${m.coverage < lim.coverage ? '  (coverage under the §1 floor)' : ''}`);
    const r = await page.evaluate(copyReport);
    seen.count = r.count;
    seen.motion = r.motion;
    r.hidden.forEach((x) => seen.hidden.add(x));
    r.sticky.forEach((x) => seen.sticky.add(x));
  }
  const type = await page.evaluate(smallestType);
  console.log(`      smallest p/li/small in <main> from the weave down: ${type.smallest.px}px ${type.smallest.what}`);
  const body = type.under16.filter((r) => !r.what.includes('data-credit'));
  check(body.length === 0, `body copy under 16 px: ${body.length}${body.map((r) => ` ${r.px}px ${r.what}`).join(';')}; captions under 16 px: ${type.under16.length - body.length} (the partner credit, a caption: floor 14)`);
  if (reduced)
    check(
      !seen.motion && seen.sticky.size === 0 && seen.hidden.size === 0,
      `reduced motion: data-motion ${seen.motion ?? 'unset'}, ${seen.sticky.size} sticky elements ${[...seen.sticky].join(', ')}, ${seen.hidden.size} of ${seen.count} copy elements hidden ${[...seen.hidden].slice(0, 4).join('; ')}`,
    );
  await page.close();
}

// ── contrast ──────────────────────────────────────────────────────────────────────────────────────
const lum = (r, g, b) => {
  const f = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
async function contrast() {
  for (const [route, size] of [['/en', DESKTOP], ['/en', PHONE], ['/vi', DESKTOP], ['/vi', PHONE], ['/vi', [1024, 768]]]) {
    const page = await open(route, size);
    const n = await page.evaluate(() => document.querySelectorAll('#vision-mission :is(h2, p)').length);
    console.log(`\ncontrast ${route} ${size.join('x')}: ${n} text blocks on the picture`);
    for (let i = 0; i < n; i++) {
      let worst = null;
      // the picture scales and the mist drifts: measure each block low, middle and high on the screen
      for (const at of [0.8, 0.5, 0.2]) {
        const t = await page.evaluate(
          async ([k, share]) => {
            const el = document.querySelectorAll('#vision-mission :is(h2, p)')[k];
            const r = el.getBoundingClientRect();
            window.scrollTo(0, r.top + scrollY + r.height / 2 - innerHeight * share);
            await new Promise((res) => setTimeout(res, 1500)); // scrub settles, the loop is playing
            el.style.color = 'transparent'; // the pixels under the text, not the text
            await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
            const b = el.getBoundingClientRect();
            const clip = { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(innerWidth, b.right) - Math.max(0, b.x), height: Math.min(innerHeight, b.bottom) - Math.max(0, b.y) };
            el.style.color = '';
            const colour = getComputedStyle(el).color.match(/[\d.]+/g).slice(0, 3).map(Number);
            el.style.color = 'transparent';
            return { clip, colour, label: `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 24)}"` };
          },
          [i, at],
        );
        const { data } = await sharp(await page.screenshot({ clip: t.clip })).removeAlpha().raw().toBuffer({ resolveWithObject: true });
        await page.evaluate((k) => (document.querySelectorAll('#vision-mission :is(h2, p)')[k].style.color = ''), i);
        let lo = 1;
        let hi = 0;
        for (let p = 0; p < data.length; p += 3) {
          const l = lum(data[p], data[p + 1], data[p + 2]);
          if (l < lo) lo = l;
          if (l > hi) hi = l;
        }
        const text = lum(...t.colour);
        const row = { label: t.label, dark: ratio(text, lo), light: ratio(text, hi) };
        if (!worst || row.light < worst.light) worst = row;
      }
      check(worst.light >= 4.5, `${worst.label.padEnd(34)} vs darkest pixel ${worst.dark.toFixed(2)}:1, vs lightest pixel ${worst.light.toFixed(2)}:1 (worst of three positions)`);
    }
    await page.close();
  }
}

if (what === 'pace' || what === 'all') await pace();
if (what === 'walk' || what === 'all') {
  await walk('/en', DESKTOP);
  await walk('/en', PHONE);
  await walk('/vi', PHONE);
}
if (what === 'contrast' || what === 'all') await contrast();
if (what === 'reduced' || what === 'all') await walk('/en', DESKTOP, true);
await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
