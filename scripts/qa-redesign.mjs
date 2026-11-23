// The non-density checks of docs/07-redesign.md §5, against a running production server.
//   overflow   375 px wide: no horizontal page scroll and no copy past either screen edge, VI and EN
//   reduced    prefers-reduced-motion: no pins (nothing sticky, no data-motion), all copy readable in flow
//   nojs       JavaScript off: all copy visible
//   lcp        4× CPU slowdown: the LCP element is hero text and lands under 2.5 s
//   hero       pinned first screen: the four beats of copy lie inside the film's textSafe box (also at 375x667),
//              each measured in its entrance pose, 12 px low
//   strip      11 screenshots down the hero's run (every 10 %): the headline, the dictionary entry and the
//              initiative line are each whole and alone on screen in at least two shots in a row (the body and
//              the last beat, the sub line and the ways in, are reported, not required)
//   weave      the film opens on the laid warps (frame 50), or on the woven cloth (89) under the roots seam,
//              never earlier; where the stage sticks it shows the cloth, and the canvas bleeds off screen;
//              screenshots there and at frames 120, 149 (the Nối Bag, the Nếp Keychain at rest), each product
//              wholly on screen with the one partner credit lit below it
//   deck       pillar cards at 1440: while a card lies under the next, its whole title still shows
//   trace     10 s wheel scroll: no long task over 50 ms, no frame over 33 ms; repeated at 4× CPU (reported only).
//              On software GL (SwiftShader, llvmpipe) both runs are reported only: there the frame times measure
//              the software compositor, not the page. The detail names the motion tier. (--use-angle=d3d11 takes
//              effect on Windows only.)
//
// Usage: node scripts/qa-redesign.mjs [--base http://localhost:3101] [--films <dir>] [--out qa/redesign]
// --films serves /film/** from a folder, as in qa-density.mjs. Exit 1 when a check fails.
import fs from 'node:fs';
import path from 'node:path';
import { serveFilms } from './qa-density.mjs';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const base = arg('base', 'http://localhost:3101').replace(/\/+$/, '');
const films = arg('films', '');
const out = path.resolve(arg('out', 'qa/redesign'));
const ROUTES = ['/en', '/vi'];
const SIZES = [
  [1440, 900],
  [390, 844],
];

// Runs in the page. Copy = text-bearing elements outside decoration.
function copyReport() {
  const copy = [...document.querySelectorAll('main :is(h1, h2, h3, p, li, dt, dd, blockquote, a), footer :is(p, a, dt, dd)')].filter(
    (el) => el.textContent.trim() && !el.closest('[aria-hidden="true"], [data-ornament]'),
  );
  const label = (el) => `${el.tagName.toLowerCase()} "${el.textContent.trim().slice(0, 40)}"`;
  return {
    count: copy.length,
    hidden: copy.filter((el) => !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })).map(label),
    outside: copy
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.left < -1 || r.right > document.documentElement.clientWidth + 1);
      })
      .map(label),
    sticky: [...document.querySelectorAll('main *')].filter((el) => getComputedStyle(el).position === 'sticky').map((el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '')),
    motion: document.documentElement.dataset.motion ?? null,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

// Runs before the page's own scripts: collects LCP, long tasks and frame times.
function probe() {
  window.__qa = { lcp: null, long: [], frames: [] };
  new PerformanceObserver((list) => {
    const e = list.getEntries().at(-1);
    const el = e.element;
    window.__qa.lcp = {
      time: Math.round(e.startTime),
      tag: el?.tagName ?? '?',
      inHero: Boolean(el?.closest('#hero')),
      text: (el?.textContent ?? '').trim().slice(0, 40),
    };
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    if (window.__qa.tracing) for (const e of list.getEntries()) window.__qa.long.push(Math.round(e.duration));
  }).observe({ type: 'longtask' });
  let last = 0;
  const tick = (t) => {
    if (window.__qa.tracing && last) window.__qa.frames.push(t - last);
    last = t;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const { chromium } = await import('playwright');
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}  ${detail}`);
};

async function open(route, [width, height], options = {}, cpu = 1) {
  const context = await browser.newContext({ viewport: { width, height }, ...options });
  const page = await context.newPage();
  if (films) await page.route('**/film/**', serveFilms(films));
  await page.addInitScript(probe);
  if (cpu > 1) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: cpu });
  await page.goto(base + route, { waitUntil: 'load' });
  return page;
}

// Walks the page a screen at a time and merges what copyReport sees at each stop.
async function walk(page) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const h = page.viewportSize().height;
  const seen = { count: 0, hidden: new Set(), outside: new Set(), sticky: new Set(), motion: null, overflow: 0 };
  for (let y = 0; y < total; y += h) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(250);
    const r = await page.evaluate(copyReport);
    seen.count = r.count;
    seen.motion = r.motion;
    seen.overflow = Math.max(seen.overflow, r.overflow);
    for (const k of ['hidden', 'outside', 'sticky']) r[k].forEach((x) => seen[k].add(x));
  }
  return seen;
}
const list = (set) => (set.size ? ` → ${[...set].slice(0, 4).join('; ')}` : '');

for (const route of ROUTES) {
  let page = await open(route, [375, 812]);
  await page.waitForTimeout(1500);
  let r = await walk(page);
  check(`overflow ${route} 375`, r.overflow <= 0 && r.outside.size === 0, `page overflow ${r.overflow}px, ${r.outside.size} of ${r.count} copy elements past an edge${list(r.outside)}`);
  await page.context().close();

  for (const size of SIZES) {
    page = await open(route, size, { reducedMotion: 'reduce' });
    await page.waitForTimeout(1500);
    r = await walk(page);
    check(
      `reduced ${route} ${size[0]}`,
      !r.motion && r.sticky.size === 0 && r.hidden.size === 0,
      `data-motion ${r.motion ?? 'unset'}, ${r.sticky.size} sticky${list(r.sticky)}, ${r.hidden.size} of ${r.count} copy elements hidden${list(r.hidden)}`,
    );
    await page.context().close();

    page = await open(route, size, { javaScriptEnabled: false });
    r = await page.evaluate(copyReport); // no scripts run, so nothing changes on scroll
    check(`nojs ${route} ${size[0]}`, r.hidden.length === 0 && r.count > 0, `${r.hidden.length} of ${r.count} copy elements hidden${list(new Set(r.hidden))}`);
    await page.context().close();

    page = await open(route, size, {}, 4);
    await page.waitForTimeout(3000);
    const lcp = await page.evaluate(() => window.__qa.lcp);
    check(
      `lcp ${route} ${size[0]} at 4x CPU`,
      Boolean(lcp) && lcp.inHero && !['IMG', 'VIDEO', 'CANVAS'].includes(lcp.tag) && lcp.time < 2500,
      lcp ? `${lcp.time} ms, <${lcp.tag.toLowerCase()}> "${lcp.text}"${lcp.inHero ? '' : ' (not in #hero)'}` : 'no LCP entry',
    );
    await page.context().close();
  }
}

// hero: while the first screen is pinned, each beat of copy lies inside the film's textSafe box (the runtime
// puts its right and bottom edges in --safe-x / --safe-y), so no copy sits on the soil or the sprout.
for (const route of ROUTES) {
  for (const size of [...SIZES, [375, 667]]) {
    const page = await open(route, size);
    await page.waitForFunction(() => document.documentElement.dataset.motion, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const hero = document.querySelector('#hero');
      const px = (name) => parseFloat(hero.style.getPropertyValue(name));
      const [x, y] = [px('--safe-x'), px('--safe-y')];
      const out = [...hero.querySelectorAll('[data-hero-beat]')].flatMap((beat, i) => {
        const b = beat.getBoundingClientRect();
        return b.right <= x + 1 && b.bottom <= y + 1 ? [] : [`beat ${i + 1} ends at ${Math.round(b.right)},${Math.round(b.bottom)}`];
      });
      return { x: Math.round(x), y: Math.round(y), out, pinned: getComputedStyle(hero.querySelector('[data-hero-pin]')).position === 'sticky' };
    });
    check(
      `hero ${route} ${size.join('x')}`,
      r.pinned && r.x > 0 && r.out.length === 0,
      r.pinned ? `textSafe ends at ${r.x},${r.y}; ${r.out.join('; ') || 'all four beats inside it'}` : 'the first screen is not pinned',
    );
    await page.context().close();
  }
}

// strip: the hero's run in eleven shots. A reader who stops on a tenth of the run must find one thing to
// read: the headline, the dictionary entry and the initiative line each hold for two shots or more.
for (const route of ROUTES) {
  for (const size of SIZES) {
    const page = await open(route, size);
    await page.waitForFunction(() => document.documentElement.dataset.motion, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const alone = []; // per shot: which of the word and beats 1 to 4 is whole with the others gone
    for (let k = 0; k <= 10; k++) {
      await page.evaluate((share) => {
        const hero = document.querySelector('#hero');
        window.scrollTo(0, hero.getBoundingClientRect().top + scrollY + share * (hero.offsetHeight - innerHeight));
      }, k / 10);
      await page.waitForTimeout(1200); // the film's scrub settles
      await page.screenshot({ path: path.join(out, `hero-${route.slice(1)}-w${size[0]}-${String(k).padStart(2, '0')}.png`) });
      alone.push(
        await page.evaluate(() => {
          const parts = [document.querySelector('[data-hero-word]'), ...document.querySelectorAll('[data-hero-beat]')].map((el) => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            const unmoved = s.transform === 'none' || s.transform === 'matrix(1, 0, 0, 1, 0, 0)';
            const onScreen = r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= document.documentElement.clientWidth;
            return { opacity: +s.opacity, whole: +s.opacity > 0.99 && unmoved && onScreen };
          });
          return parts.findIndex((p, i) => p.whole && parts.every((q, j) => j === i || q.opacity < 0.02));
        }),
      );
    }
    const held = (i) => alone.some((a, k) => a === i && alone[k + 1] === i);
    const names = ['headline', 'dictionary entry', 'body', 'initiative line', 'sub line and ways in'];
    const missing = [0, 1, 3].filter((i) => !held(i)).map((i) => names[i]);
    check(
      `strip ${route} ${size[0]}`,
      missing.length === 0,
      `alone per shot: ${alone.map((a) => names[a] ?? '-').join(', ')}${missing.length ? `; not held for two shots: ${missing.join(', ')}` : ''}`,
    );
    await page.context().close();
  }
}

// weave: one screenshot per named film frame, and the stage's geometry at each. The warp beat fills the
// canvas, so the canvas must run off the part of the section that is on screen (top, bottom and right from
// 1280; both sides on a phone), while every opaque pixel of the product on show stays on it. Each product's
// box comes from its key frame; 1280x720 and 1920x1080 are checked too, since the stage scales with both.
{
  const sharp = (await import('sharp')).default;
  const boxes = {}; // frame -> left, top, right, bottom of that product, as shares of the canvas
  for (const [frame, key] of [[120, 's-0129'], [149, 's-0149']]) {
    const box = (boxes[frame] = [1, 1, 0, 0]);
    const { data, info } = await sharp(path.resolve(films || 'public/film', 'weave/keys', `${key}.webp`)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3, n = 0; i < data.length; i += 4, n++) {
      if (data[i] < 128) continue;
      const x = (n % info.width) / info.width;
      const y = Math.floor(n / info.width) / info.height;
      box.splice(0, 4, Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y));
    }
  }
  // The credit's words differ by language, so Vietnamese is run at the two main sizes as well.
  for (const [route, size] of [...[...SIZES, [1280, 720], [1920, 1080]].map((s) => ['/en', s]), ...SIZES.map((s) => ['/vi', s])]) {
    const tag = route === '/en' ? '' : `${route.slice(1)}-`;
    const page = await open(route, size);
    await page.waitForFunction(() => document.documentElement.dataset.motion, null, { timeout: 15000 }).catch(() => {});
    const frameAt = async (y) => {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(900); // the scrub's catch-up, then the seek
      return page.evaluate(() => Number(document.querySelector('[data-film="weave"] canvas[data-frame]')?.dataset.frame));
    };
    const span = await page.evaluate(() => {
      const r = document.querySelector('#craft').getBoundingClientRect();
      return [r.top + scrollY - innerHeight, r.bottom + scrollY];
    });
    const geometry = () =>
      page.evaluate(() => {
        const r = document.querySelector('[data-film="weave"]').getBoundingClientRect();
        const s = document.querySelector('#craft').getBoundingClientRect();
        const nav = document.querySelector('header nav, header')?.getBoundingClientRect().bottom ?? 0;
        const vw = document.documentElement.clientWidth;
        const credits = [...document.querySelectorAll('#craft [data-credit]')];
        const c = credits[0]?.getBoundingClientRect();
        const credit = {
          n: credits.length,
          top: c?.top ?? 0,
          lit: credits.length > 0 && +getComputedStyle(credits[0]).opacity > 0.99,
          inView: Boolean(c) && c.height > 0 && c.top >= 0 && c.left >= 0 && c.bottom <= innerHeight && c.right <= vw,
        };
        return { l: r.left, t: r.top, w: r.width, h: r.height, vw, top: Math.max(0, s.top), bottom: Math.min(innerHeight, s.bottom), nav, credit };
      });
    const bleedsOff = (g) => (g.vw >= 1280 ? g.t < g.top && g.t + g.h > g.bottom && g.l + g.w > g.vw : g.l < 0 && g.l + g.w > g.vw);
    const bad = [];
    // The cloth. The film never shows the yarn before the laid warps (Maxwell, 17 November): it opens on 50, or
    // on the woven cloth (89) under the roots seam (Full tier). Checked as the section arrives and where the
    // stage sticks (#craft's top at the screen's top), before the bag forms at 109.
    {
      const opens = (await page.evaluate(() => document.documentElement.dataset.roots === 'on')) ? 89 : 50;
      const first = await frameAt(span[0]);
      const cloth = await frameAt(span[0] + size[1]);
      await page.screenshot({ path: path.join(out, `weave-${tag}cloth-w${size[0]}.png`) });
      const g = await geometry();
      if (first !== opens || !(cloth >= opens && cloth < 109) || !bleedsOff(g))
        bad.push(`cloth: opens on ${first} (want ${opens}), ${cloth} where the stage sticks (want ${opens} to 108)${bleedsOff(g) ? '' : ', canvas edge on screen'}`);
    }
    for (const target of [120, 149]) {
      let [lo, hi] = span;
      while (hi - lo > 4) {
        const mid = (lo + hi) / 2;
        if ((await frameAt(mid)) < target) lo = mid;
        else hi = mid;
      }
      const frame = await frameAt(hi);
      await page.screenshot({ path: path.join(out, `weave-${tag}f${String(target).padStart(3, '0')}-w${size[0]}.png`) });
      const g = await geometry();
      const wide = g.vw >= 1280;
      const bleeds = bleedsOff(g);
      const box = boxes[target];
      const [l, t, r, b] = [g.l + box[0] * g.w, g.t + box[1] * g.h, g.l + box[2] * g.w, g.t + box[3] * g.h];
      const inside = l >= 0 && r <= g.vw && t >= (wide ? g.top : Math.max(g.top, g.nav)) && b <= g.bottom;
      // A product on screen carries the partner credit: one copy, lit, on screen, under the product.
      const { credit } = g;
      const credited = (credit.n === 1 && credit.lit && credit.inView && credit.top >= b - 1);
      if (frame !== target || !bleeds || !inside || !credited)
        bad.push(
          `frame ${target}: got ${frame}${bleeds ? '' : ', canvas edge on screen'}${inside ? '' : `, product ${Math.round(l)},${Math.round(t)} to ${Math.round(r)},${Math.round(b)} leaves ${g.vw} wide, ${Math.round(g.top)} to ${Math.round(g.bottom)}`}${
            credited ? '' : `, credit: ${credit.n} copies, ${credit.lit ? 'lit' : 'not lit'}, ${credit.inView ? 'on screen' : 'off screen'}, top ${Math.round(credit.top)} against product foot ${Math.round(b)}`
          }`,
        );
    }
    check(
      `weave ${route} ${size[0]}`,
      bad.length === 0,
      bad.join('; ') || 'opens on the cloth; frames 120, 149 shot; canvas bleeds off screen, each product inside it; one credit on screen under each product',
    );
    await page.context().close();
  }
}

// deck: scroll through the pillars; whenever the next card lies over a card, that card's title must end
// above it. The stack has to form (all three overlapping) for the check to mean anything.
for (const route of ROUTES) {
  const page = await open(route, SIZES[0]);
  await page.waitForFunction(() => document.documentElement.dataset.motion, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const [from, to] = await page.evaluate(() => {
    const r = document.querySelector('#pillars').getBoundingClientRect();
    return [r.top + scrollY - innerHeight, r.bottom + scrollY];
  });
  const clipped = new Set();
  let stacked = false;
  for (let y = from; y < to; y += 30) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(60);
    const r = await page.evaluate(() => {
      const cards = [...document.querySelector('#pillars [data-deck]').children].map((li) => ({
        box: li.getBoundingClientRect(),
        title: li.querySelector('h3').getBoundingClientRect(),
        name: li.querySelector('h3').textContent.trim(),
      }));
      const under = cards.map((c, i) => i + 1 < cards.length && cards[i + 1].box.top < c.box.bottom - 1);
      return {
        stacked: under.slice(0, -1).every(Boolean),
        clipped: cards.flatMap((c, i) => (under[i] && c.title.bottom > cards[i + 1].box.top + 0.5 ? [`"${c.name}" by ${Math.round(c.title.bottom - cards[i + 1].box.top)}px`] : [])),
      };
    });
    r.clipped.forEach((c) => clipped.add(c));
    if(r.stacked && !stacked) await page.screenshot({ path: path.join(out, `deck-${route.slice(1)}-w1440.png`) }); // the first stacked screen
    stacked ||= r.stacked;
  }
  check(`deck ${route} 1440`, stacked && clipped.size === 0, stacked ? (clipped.size ? `titles cut by the next card: ${[...clipped].join('; ')}` : 'the deck stacks; every title under a card shows whole') : 'the deck never stacked');
  await page.context().close();
}

for (const cpu of [1, 4]) {
  const page = await open('/en', SIZES[0], {}, cpu);
  await page.waitForFunction(() => document.documentElement.dataset.motion, null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const env = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return { gl: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '', tier: document.documentElement.dataset.tier ?? '?' };
  });
  const software = /swiftshader|llvmpipe|software/i.test(env.gl);
  const step = (await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)) / 100;
  await page.mouse.move(700, 450);
  await page.evaluate(() => (window.__qa.tracing = true));
  for (let i = 0; i < 100; i++) {
    await page.mouse.wheel(0, step);
    await page.waitForTimeout(100);
  }
  const t = await page.evaluate(() => ({ long: window.__qa.long, frames: window.__qa.frames, y: Math.round(scrollY) }));
  const worst = Math.max(0, ...t.frames);
  const over = t.frames.filter((f) => f > 33.4).length;
  const longOver = t.long.filter((d) => d > 50);
  const detail = `${t.frames.length} frames, worst ${worst.toFixed(1)} ms, ${over} over 33 ms; long tasks over 50 ms: ${longOver.length}${longOver.length ? ` (${longOver.join(', ')} ms)` : ''}; reached y=${t.y}${films ? `; films from ${films}` : ''}; tier ${env.tier}${software ? `; software GL (${env.gl})` : ''}`;
  // 4× is the brief's second, informative run: this PC throttled is not a pass/fail device. Nor is a machine
  // that draws WebGL and composites the page in software: there every frame waits on the compositor.
  if (cpu === 1 && !software) check('trace /en 1440, 10 s', over === 0 && longOver.length === 0, detail);
  else {
    const label = `trace /en 1440, 10 s${cpu > 1 ? ' at 4x CPU' : ''}`;
    console.log(`info  ${label}  ${software ? 'not a pass/fail device: ' : ''}${detail}`);
    results.push({ name: `${label} (reported only)`, ok: null, detail });
  }
  await page.context().close();
}

await browser.close();
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.ok === false).length;
console.log(`\nredesign checks: ${results.filter((r) => r.ok).length} pass, ${failed} fail`);
process.exit(failed ? 1 : 0);
