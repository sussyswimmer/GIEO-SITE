// Phase 2 motion QA for a running site (does not start or stop servers).
// Usage: node scripts/qa-motion.mjs --base http://localhost:3100 --out qa/phase2 [--only trace|keys|touch|tiers|scenes|lotus|seed|weave|reveal|webgl|parallax|fallback|lowtier]
// Writes <out>/motion-report.json, <out>/scroll-trace.json and <out>/scene-*.png. Exits 1 on a failed check,
// console error or page error. parallax runs only with --only parallax and wants `next dev` (no consented photos in production).

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import os from 'node:os';
import { frameAt, keyAt } from '../src/lib/fallback-timeline.ts';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const base = arg('base', 'http://localhost:3100').replace(/\/+$/, '');
const outDir = path.resolve(arg('out', 'qa/phase2'));
const only = arg('only', null);
const GROUPS = ['trace', 'keys', 'touch', 'tiers', 'scenes', 'lotus', 'seed', 'weave', 'reveal', 'webgl', 'parallax', 'fallback', 'lowtier'];
if (only && !GROUPS.includes(only)) throw new Error(`--only must be one of ${GROUPS.join('|')}`);
const wants = (g) => (only ? only === g : g !== 'parallax');

fs.mkdirSync(outDir, { recursive: true });

const LAUNCH_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'];

// Same approach as qa-screens.mjs: installed Chrome (new headless), else a cached Playwright build; never download.
async function launchBrowser() {
  try {
    return await chromium.launch({ channel: 'chrome', headless: true, args: LAUNCH_ARGS });
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
            return await chromium.launch({ executablePath: exe, headless: true, args: LAUNCH_ARGS });
          } catch (err) {
            console.warn(`[qa] cached browser failed: ${err.message.split('\n')[0]}`);
          }
        }
      }
    }
  }
  throw new Error('No usable browser: install Google Chrome or set up a cached Playwright Chromium.');
}

const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

async function newPage(browser, label, opts = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'vi-VN', ...opts,
  });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${label}: console: ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`${label}: pageerror: ${e.message}`));
  return { context, page };
}

const waitReady = (page) => page.waitForSelector('html[data-canvas="ready"]', { state: 'attached', timeout: 30000 });

// Sums transferred script bytes and flags chunks that contain three.js (WebGLRenderer).
async function trackScripts(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const reqs = new Map();
  const pending = [];
  cdp.on('Network.responseReceived', (e) => {
    if (e.type === 'Script') reqs.set(e.requestId, { url: e.response.url, bytes: 0, three: false });
  });
  cdp.on('Network.loadingFinished', (e) => {
    const r = reqs.get(e.requestId);
    if (!r) return;
    r.bytes = e.encodedDataLength;
    pending.push(cdp.send('Network.getResponseBody', { requestId: e.requestId }).then((b) => {
      const text = b.base64Encoded ? Buffer.from(b.body, 'base64').toString('latin1') : b.body;
      r.three = /WebGLRenderer/.test(text);
      r.lazyThree = /WebGLRenderer|GLTFLoader|MeshoptDecoder|EXT_meshopt_compression/.test(text);
      r.r3f = /__r3f/.test(text); // R3F calls new WebGLRenderer, so it is caught by `three` too; 03 §7 excludes only three.js
    }).catch(() => {}));
  });
  return {
    async result() {
      await Promise.all(pending);
      const all = [...reqs.values()];
      const three = all.filter((r) => r.three);
      const sum = (a) => a.reduce((s, r) => s + r.bytes, 0);
      // lazyThree, not three: the three/examples loaders are three.js too, which 03 §7 excludes.
      return { totalBytes: sum(all), excludingThreeBytes: sum(all.filter((r) => !r.lazyThree)),
        r3fBytes: sum(all.filter((r) => r.r3f)),
        threeChunks: three.map((r) => r.url), scripts: all.length, list: all };
    },
  };
}

// In-page rAF delta sampler.
const startSampler = (page) => page.evaluate(() => {
  const s = { d: [], stop: false };
  window.__qa = s;
  let last = 0;
  const tick = (t) => { s.d.push(t - last); last = t; if (!s.stop) requestAnimationFrame(tick); };
  requestAnimationFrame((t) => { last = t; requestAnimationFrame(tick); });
});
const stopSampler = (page) => page.evaluate(() => { window.__qa.stop = true; return window.__qa.d.slice(1); });

function frameStats(d) {
  const s = [...d].sort((a, b) => a - b);
  return {
    frames: d.length,
    maxFrameMs: round(s.at(-1) ?? 0),
    over33_4: d.filter((x) => x > 33.4).length,
    over50: d.filter((x) => x > 50).length,
    p95Ms: round(s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] ?? 0),
  };
}

const webglInfo = (page) => page.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl2');
  if (!gl) return { webgl2: false, renderer: null };
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return { webgl2: true, renderer };
});

const scrollMax = (page) => page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
const scrollY = (page) => page.evaluate(() => window.scrollY);

// ---- 1. trace ----
async function readStream(cdp, handle) {
  let text = '';
  for (;;) {
    const r = await cdp.send('IO.read', { handle });
    text += r.base64Encoded ? Buffer.from(r.data, 'base64').toString('utf8') : r.data;
    if (r.eof) break;
  }
  await cdp.send('IO.close', { handle });
  return text;
}

function analyseTrace(text, pageUrl) {
  const parsed = JSON.parse(text);
  const events = Array.isArray(parsed) ? parsed : parsed.traceEvents;
  const mains = events.filter((e) => e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain');
  // The renderer whose frames match the page URL (TracingStartedInBrowser lists frames with processId).
  const started = events.find((e) => e.name === 'TracingStartedInBrowser');
  const frame = started?.args?.data?.frames?.find((f) => f.url === pageUrl || f.url?.startsWith(pageUrl.split('?')[0]));
  let main = frame ? mains.find((m) => m.pid === frame.processId) : null;
  let how = 'frame-match';
  if (!main) { // fallback: the CrRendererMain with the most RunTask time
    how = 'busiest-renderer-fallback';
    const busy = (m) => events.filter((e) => e.name === 'RunTask' && e.pid === m.pid && e.tid === m.tid)
      .reduce((s, e) => s + (e.dur || 0), 0);
    main = mains.sort((a, b) => busy(b) - busy(a))[0];
  }
  if (!main) throw new Error('trace has no CrRendererMain thread');
  const mark = (n) => events.find((e) => e.pid === main.pid && e.name === n)?.ts;
  const t0 = mark('qa-scroll-start');
  const t1 = mark('qa-scroll-end');
  if (t0 === undefined || t1 === undefined) throw new Error('scroll marks missing from trace');
  const longTasks = events
    .filter((e) => e.ph === 'X' && e.name === 'RunTask' && e.pid === main.pid && e.tid === main.tid
      && e.dur > 50000 && e.ts < t1 && e.ts + e.dur > t0)
    .map((e) => ({ atMs: round((e.ts - t0) / 1000), durMs: round(e.dur / 1000) }));
  return { rendererPid: main.pid, rendererTid: main.tid, rendererChosenBy: how, longTasks };
}

async function checkTrace(browser) {
  const { context, page } = await newPage(browser, 'trace');
  const url = `${base}/?tier=full`;
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await waitReady(page);
  await page.waitForTimeout(1000);
  const cdp = await context.newCDPSession(page);
  const done = new Promise((res) => cdp.once('Tracing.tracingComplete', res));
  await cdp.send('Tracing.start', {
    categories: 'devtools.timeline,disabled-by-default-devtools.timeline,v8.execute,blink.user_timing',
    transferMode: 'ReturnAsStream',
  });
  const max = await scrollMax(page);
  const DURATION = 10000, STEP = 16;
  await page.mouse.move(720, 450);
  await startSampler(page);
  await page.evaluate(() => performance.mark('qa-scroll-start'));
  const began = Date.now();
  // Sized from elapsed time: one wheel round trip can outlast a step, and 10 s must still cover the page.
  for (let sent = 0; sent < max;) {
    const stepStart = Date.now();
    const target = Math.min(max, (max * (stepStart - began + STEP)) / DURATION);
    await page.mouse.wheel(0, target - sent);
    sent = target;
    const wait = stepStart + STEP - Date.now();
    if (wait > 0) await sleep(wait);
  }
  const scrollMs = Date.now() - began;
  await page.evaluate(() => performance.mark('qa-scroll-end'));
  const deltas = await stopSampler(page);
  const finalProgress = round((await scrollY(page)) / max, 3);
  await cdp.send('Tracing.end');
  const { stream } = await done;
  const text = await readStream(cdp, stream);
  fs.writeFileSync(path.join(outDir, 'scroll-trace.json'), text);
  const t = analyseTrace(text, page.url());
  const stats = frameStats(deltas);
  await context.close();
  return {
    scrollMs, scrollHeightMinusViewport: max, finalProgress,
    longTaskCount: t.longTasks.length, longTaskMaxMs: Math.max(0, ...t.longTasks.map((l) => l.durMs)),
    longTasks: t.longTasks, renderer: { pid: t.rendererPid, tid: t.rendererTid, chosenBy: t.rendererChosenBy },
    ...stats, pass: t.longTasks.length === 0 && stats.over33_4 === 0,
  };
}

// ---- 2. keys ----
async function checkKeys(browser) {
  const { context, page } = await newPage(browser, 'keys');
  await page.goto(`${base}/?tier=full`, { waitUntil: 'load', timeout: 60000 });
  await waitReady(page);
  const start = await scrollY(page);
  const presses = [];
  let pass = true;
  for (const key of ['PageDown', 'Space']) {
    for (let i = 0; i < 6; i++) {
      const before = await scrollY(page);
      await page.keyboard.press(key);
      await page.waitForTimeout(500);
      const after = await scrollY(page);
      presses.push({ key, before: round(before), after: round(after) });
      if (!(after > before)) pass = false;
    }
  }
  const end = await scrollY(page);
  await context.close();
  return { start, end: round(end), presses, pass: pass && end > start };
}

// ---- 3. touch ----
// Input.synthesizeScrollGesture with gestureSourceType 'touch' is a no-op in headless Chrome on Windows (a plain page
// does not scroll either), so send real touch points: 3 strokes of 600 px at 1200 px/s make the spec's 1800 px gesture.
async function swipe(cdp) {
  const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  for (let stroke = 0; stroke < 3; stroke++) {
    await send('touchStart', [{ x: 187, y: 700 }]);
    for (let i = 1; i <= 30; i++) {
      await send('touchMove', [{ x: 187, y: 700 - i * 20 }]);
      await sleep(16);
    }
    await send('touchEnd', []);
  }
}

async function checkTouch(browser) {
  const { context, page } = await newPage(browser, 'touch', {
    viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true,
  });
  await page.goto(`${base}/?tier=full`, { waitUntil: 'load', timeout: 60000 });
  await waitReady(page);
  const cdp = await context.newCDPSession(page);
  await startSampler(page);
  const gestures = [];
  for (let i = 0; i < 3; i++) {
    const before = await scrollY(page);
    await swipe(cdp);
    await page.waitForTimeout(300);
    const after = await scrollY(page);
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    gestures.push({ before: round(before), after: round(after), htmlClass });
  }
  const stats = frameStats(await stopSampler(page));
  await context.close();
  const advanced = gestures.every((g) => g.after > g.before);
  const noLenisTouch = gestures.every((g) => !/lenis-smooth/.test(g.htmlClass));
  return { gestures, advanced, noLenisTouch, ...stats, pass: advanced && noLenisTouch && stats.over50 === 0 };
}

// ---- 4 + 5. tiers and js budget ----
async function loadAndSettle(page, url, scripts) {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => !!document.documentElement.dataset.tier, null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  return scripts.result();
}

async function checkTiers(browser) {
  const cases = [];
  const run = async (name, route, expectCanvas, ctxOpts = {}) => {
    const { context, page } = await newPage(browser, `tiers ${name}`, ctxOpts);
    const scripts = await trackScripts(page);
    // A reader's first intent releases boot early, so the still/lite pages are not judged before the timer fires.
    const js = await loadAndSettle(page, base + route, scripts);
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(800);
    const j = await scripts.result();
    // Phase 6: Lite composites its videos in small canvases inside the stages, so only canvases outside them count.
    const canvases = await page.locator('canvas:not([data-scene-stage] canvas)').count();
    const tier = await page.evaluate(() => document.documentElement.dataset.tier);
    const lenis = await page.evaluate(() => document.documentElement.classList.contains('lenis'));
    const c = { name, route, tier, canvases, lenis, threeChunks: j.threeChunks, scripts: js.scripts,
      pass: canvases === (expectCanvas ? 1 : 0) && (expectCanvas ? j.threeChunks.length > 0 : j.threeChunks.length === 0) };
    cases.push(c);
    await context.close();
    return c;
  };
  await run('full', '/?tier=full', true);
  await run('still', '/?tier=still', false);
  await run('lite', '/?tier=lite', false);
  await run('inner-full', '/about?tier=full', false);

  // Reduced motion with no override.
  {
    const { context, page } = await newPage(browser, 'tiers reduced', { reducedMotion: 'reduce' });
    const scripts = await trackScripts(page);
    await loadAndSettle(page, base + '/', scripts);
    const tier = await page.evaluate(() => document.documentElement.dataset.tier);
    const canvases = await page.locator('canvas:not([data-poster])').count(); // Still posters are 2D canvases; no WebGL canvas may exist
    const lenis = await page.evaluate(() => document.documentElement.classList.contains('lenis'));
    const h2 = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main h2')].find((h) => h.getBoundingClientRect().top > window.innerHeight);
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      return true;
    });
    await page.waitForTimeout(1000);
    const opacity = await page.evaluate(() => {
      const el = [...document.querySelectorAll('main h2')].find((h) => {
        const r = h.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= window.innerHeight;
      });
      return el ? parseFloat(getComputedStyle(el).opacity) : null;
    });
    cases.push({ name: 'reduced-motion', tier, canvases, lenis, belowFoldH2Found: h2, h2Opacity: opacity,
      pass: tier === 'still' && canvases === 0 && !lenis && h2 === true && opacity === 1 });
    await context.close();
  }

  // js budget: gzip over the wire from `next start`.
  let budget;
  {
    const { context, page } = await newPage(browser, 'budget');
    const scripts = await trackScripts(page);
    await page.goto(`${base}/?tier=full`, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    const j = await scripts.result();
    const LIMIT = 220 * 1024;
    budget = { totalKB: round(j.totalBytes / 1024), excludingThreeKB: round(j.excludingThreeBytes / 1024),
      withR3fKB: round((j.excludingThreeBytes + j.r3fBytes) / 1024),
      limitKB: 220, threeChunks: j.threeChunks, pass: j.excludingThreeBytes < LIMIT && j.threeChunks.length > 0 };
    await context.close();
  }
  return { cases, budget, pass: cases.every((c) => c.pass) && budget.pass };
}

// ---- 6. scenes ----
async function checkScenes(browser) {
  const results = [];
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const { context, page } = await newPage(browser, `scenes@${w}`, { viewport: { width: w, height: h } });
    await page.goto(`${base}/?tier=full`, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    // Scoped to main: <html> carries data-scene too, once a scene is active.
    const scenes = await page.evaluate(() => [...document.querySelectorAll('main [data-scene]')].map((s) => s.dataset.scene));
    for (const name of scenes) {
      const entry = { width: w, scene: name, shots: [], activeAtHalf: null, pass: false };
      for (const p of [0, 0.25, 0.5, 0.75, 1]) {
        await page.evaluate(([n, q]) => {
          const el = document.querySelector(`main [data-scene="${n}"]`);
          const top = el.getBoundingClientRect().top + window.scrollY;
          const y = top - window.innerHeight + q * (el.offsetHeight + window.innerHeight);
          window.scrollTo(0, Math.max(0, Math.min(y, document.documentElement.scrollHeight - window.innerHeight)));
        }, [name, p]);
        await page.waitForTimeout(1200);
        const file = path.join(outDir, `scene-${name}-${p}@${w}.png`);
        await page.screenshot({ path: file });
        entry.shots.push(file);
        if (p === 0.5) entry.activeAtHalf = await page.evaluate(() => document.documentElement.dataset.scene || '');
      }
      entry.pass = entry.activeAtHalf === name;
      results.push(entry);
    }
    const fonts = await page.evaluate(() => document.fonts.status);
    results.push({ width: w, fontsStatus: fonts, sceneCount: scenes.length, pass: fonts === 'loaded' && scenes.length > 0 });
    await context.close();
  }
  return { results, pass: results.every((r) => r.pass) };
}

// ---- lotus: lazy load, per-beat state and screenshots ----
const BEAT_SHOTS = [['rise', 1], ['p1', 1], ['p2', 1], ['p3', 1], ['bloom', 1],
  ['finale', 0], ['finale', 0.5], ['finale', 0.9], ['finale', 0.95], ['finale', 1]];

async function checkLotus(browser) {
  const results = [];
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const { context, page } = await newPage(browser, `lotus@${w}`, { viewport: { width: w, height: h } });
    const scripts = await trackScripts(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    const glb = { bytes: 0, ids: new Set() };
    cdp.on('Network.responseReceived', (e) => { if (e.response.url.endsWith('/lotus.glb')) glb.ids.add(e.requestId); });
    cdp.on('Network.loadingFinished', (e) => { if (glb.ids.has(e.requestId)) glb.bytes = e.encodedDataLength; });
    const entry = { width: w, glbBytes: 0, afterScroll: null, cards: [], beats: [], pass: false };
    const fails = [];
    await page.goto(`${base}/?tier=full`, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    await page.waitForTimeout(1000);
    const before = new Set((await scripts.result()).list.map((r) => r.url));
    const scrollTo = async (y) => { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(1500); };
    await page.evaluate(() => window.scrollTo(0, document.querySelector('[data-scene-stage="lotus"]').getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4));
    await page.waitForSelector('html[data-lotus="ready"]', { state: 'attached', timeout: 15000 });
    const after = (await scripts.result()).list.filter((r) => !before.has(r.url));
    const sum = (a) => a.reduce((t, r) => t + r.bytes, 0);
    entry.glbBytes = glb.bytes;
    entry.afterScroll = { scripts: after.length, threeBytes: sum(after.filter((r) => r.lazyThree)),
      nonThreeBytes: sum(after.filter((r) => !r.lazyThree)), threeChunks: after.filter((r) => r.lazyThree).map((r) => r.url) };

    if (w === 1440) {
      for (let i = 0; i < 3; i++) {
        await scrollTo(await page.evaluate((n) => {
          const r = document.querySelectorAll('#pillars article')[n].getBoundingClientRect();
          return r.top + window.scrollY + r.height / 2 - window.innerHeight / 2;
        }, i));
        const s = await page.evaluate(() => ({ lotus: window.__gieoMotion.store.getState().lotus,
          active: [...document.querySelectorAll('#pillars article')].map((a) => a.dataset.active === 'true') }));
        const own = s.lotus[`p${i + 1}`];
        const next = i < 2 ? s.lotus[`p${i + 2}`] : 0;
        const onlyMe = s.active.every((a, j) => a === (j === i));
        const file = path.join(outDir, `lotus-card${i + 1}@${w}.png`);
        await page.screenshot({ path: file });
        entry.cards.push({ card: i + 1, own: round(own, 2), next: round(next, 2), active: s.active, file });
        if (own < 0.9 || next > 0.25 || !onlyMe) fails.push(`card${i + 1}`);
      }
    }

    for (const [beat, q] of BEAT_SHOTS) {
      const pos = await page.evaluate(([b, k]) => {
        const st = window.__gieoMotion.ScrollTrigger.getById(`lotus-${b}`);
        return st ? st.start + k * (st.end - st.start) : null;
      }, [beat, q]);
      if (pos === null) { fails.push(`${beat}: no trigger`); continue; }
      await scrollTo(pos);
      const value = await page.evaluate((b) => window.__gieoMotion.store.getState().lotus[b], beat);
      const file = path.join(outDir, beat === 'finale' ? `lotus-finale-${q}@${w}.png` : `lotus-${beat}@${w}.png`);
      await page.screenshot({ path: file });
      const ok = beat === 'finale' ? Math.abs(value - q) <= 0.1 : value >= 0.9;
      entry.beats.push({ beat, q, value: round(value, 2), ok, file });
      if (!ok) fails.push(`${beat}@${q}=${round(value, 2)}`);
    }
    entry.fails = fails;
    entry.pass = fails.length === 0 && entry.glbBytes > 0;
    results.push(entry);
    await context.close();
  }
  return { results, pass: results.every((r) => r.pass) };
}

// ---- reveal: line reveals must really tween in the production build ----
async function checkReveal(browser) {
  const { context, page } = await newPage(browser, 'reveal');
  await page.goto(`${base}/?tier=still`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('html[data-tier]', { state: 'attached', timeout: 15000 });
  await page.waitForTimeout(800);
  const mid = await page.evaluate(() => new Promise((resolve) => {
    const h = [...document.querySelectorAll('main h2')].find((x) => x.getBoundingClientRect().top > window.innerHeight);
    window.scrollTo(0, h.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.8);
    setTimeout(() => {
      const line = h.querySelector(':scope > span');
      resolve(line && { offsetPx: Math.round(line.getBoundingClientRect().top - h.getBoundingClientRect().top), opacity: +getComputedStyle(line).opacity });
    }, 60);
  }));
  await page.waitForTimeout(1200);
  const heading = await page.evaluate(() => {
    const y = window.innerHeight * 0.8;
    const h = [...document.querySelectorAll('main h2')].find((x) => Math.abs(x.getBoundingClientRect().top - y) < 40);
    return h ? h.querySelectorAll(':scope > span').length : null;
  });
  await context.close();
  return { mid, linesLeftAfter: heading, pass: !!mid && mid.offsetPx > 0 && mid.opacity < 1 && heading === 0 };
}

// ---- webgl: a context that fails after the tier probe must not take the copy down ----
async function checkWebglFailure(browser) {
  // Not newPage: three.js logs the failure, and here that is the expected path.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const real = HTMLCanvasElement.prototype.getContext;
    let webgl = 0;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (type.startsWith('webgl') && ++webgl > 1) return null; // the probe succeeds, the real canvas does not
      return real.call(this, type, ...rest);
    };
  });
  await page.goto(`${base}/?tier=full`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('html[data-tier]', { state: 'attached', timeout: 15000 });
  await page.waitForTimeout(3000);
  const state = await page.evaluate(() => ({
    h1: document.querySelectorAll('main h1').length,
    still: getComputedStyle(document.querySelector('[data-scene-stage]'), '::before').opacity,
  }));
  await context.close();
  return { ...state, pass: state.h1 === 1 && state.still === '1' };
}

// ---- 7. parallax (next dev) ----
async function checkParallax(browser) {
  const { context, page } = await newPage(browser, 'parallax');
  await page.goto(`${base}/?tier=full`, { waitUntil: 'load', timeout: 90000 });
  await waitReady(page);
  const found = await page.locator('[data-parallax]').count();
  if (!found) { await context.close(); return { found, pass: false, note: 'no [data-parallax] element (needs next dev)' }; }
  const read = async (offset) => {
    await page.evaluate((o) => {
      const frame = document.querySelector('[data-parallax]').parentElement;
      window.scrollTo(0, frame.getBoundingClientRect().top + window.scrollY - window.innerHeight * o);
    }, offset);
    await page.waitForTimeout(1200);
    return page.evaluate(() => getComputedStyle(document.querySelector('[data-parallax]')).transform);
  };
  const a = await read(0.8);
  const b = await read(0.2);
  await context.close();
  return { found, transformA: a, transformB: b, pass: a !== b };
}

// ---- seed: GLB budget, scrub, pin, thread handoff, idle ----
const SEED_QS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];

// Mint = green clearly above red and blue; the cream and peach backgrounds never are.
async function mintInTopRows(file, x0, x1) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  let hits = 0;
  for (let y = 0; y < 6; y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(info.width, Math.ceil(x1)); x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i + 1] - Math.max(data[i], data[i + 2]) >= 8) hits++;
    }
  }
  return hits;
}

async function checkSeed(browser) {
  const results = [];
  for (const [w, h] of [[1440, 900], [375, 812], [768, 1024], [1024, 768]]) {
    const { context, page } = await newPage(browser, `seed@${w}`, { viewport: { width: w, height: h } });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    const glb = { bytes: 0, ids: new Set() };
    cdp.on('Network.responseReceived', (e) => { if (e.response.url.endsWith('/seed.glb')) glb.ids.add(e.requestId); });
    cdp.on('Network.loadingFinished', (e) => { if (glb.ids.has(e.requestId)) glb.bytes = e.encodedDataLength; });
    const entry = { width: w, glbBytes: 0, shots: [], pin: null, handoff: null, idle: null, fails: [], pass: false };
    const fails = entry.fails;
    await page.goto(`${base}/?tier=full`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('html[data-seed="ready"]', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(1000);
    entry.glbBytes = glb.bytes;
    if (!(glb.bytes > 0 && glb.bytes <= 600 * 1024)) fails.push(`glb ${glb.bytes} bytes`);

    const frames = () => page.evaluate(() => window.__gieoGL.info.render.frame);
    const at = async (q) => {
      await page.evaluate((k) => {
        const st = window.__gieoMotion.ScrollTrigger.getById('seed');
        window.scrollTo(0, st.start + k * (st.end - st.start));
      }, q);
    };
    const geometry = () => page.evaluate(() => ({
      stageTop: document.querySelector('[data-scene-stage="seed"]').getBoundingClientRect().top,
      textTop: document.querySelector('[data-hero-drift]').getBoundingClientRect().top,
      seed: window.__gieoMotion.store.getState().seed,
    }));

    // Idle at the top: the bob alone, capped near 30 fps.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1500);
    const f0 = await frames();
    await page.waitForTimeout(1000);
    const idleTop = (await frames()) - f0;
    if (idleTop < 15 || idleTop > 45) fails.push(`idle at 0: ${idleTop} frames/s`);

    const tops = {};
    for (const q of [0.05, ...SEED_QS, 0.8]) {
      await at(q);
      await page.waitForTimeout(1500);
      const g = await geometry();
      if (q === 0.05 || q === 0.8) tops[q] = g;
      if (SEED_QS.includes(q)) {
        const file = path.join(outDir, `seed-q${q}@${w}.png`);
        await page.screenshot({ path: file });
        entry.shots.push({ q, seed: round(g.seed, 2), file });
        if (Math.abs(g.seed - q) > 0.05) fails.push(`q${q}: store.seed=${round(g.seed, 2)}`);
        if (q === 1) {
          const box = await page.evaluate(() => { const r = document.querySelector('[data-scene-stage="seed"]').getBoundingClientRect(); return [r.left, r.width]; });
          const hits = await mintInTopRows(file, box[0] - 0.3 * box[1], box[0] + 1.3 * box[1]);
          entry.handoff = { mintPixelsInTop6Rows: hits };
          if (hits === 0) fails.push('thread does not reach the top of the frame at q=1');
        }
      }
    }
    const a = tops[0.05], b = tops[0.8];
    entry.pin = { stageTopDrift: round(Math.abs(b.stageTop - a.stageTop)), textMovedViewports: round((a.textTop - b.textTop) / h, 2) };
    if (entry.pin.stageTopDrift > 2) fails.push(`stage moved ${entry.pin.stageTopDrift}px`);
    if (entry.pin.textMovedViewports < 0.4) fails.push(`text moved only ${entry.pin.textMovedViewports} viewports`);

    // Settled: nothing may render without input.
    await at(0.8);
    await page.waitForTimeout(2000);
    const f1 = await frames();
    await page.waitForTimeout(1000);
    const idleMid = (await frames()) - f1;
    entry.idle = { atTop: idleTop, atQ0_8: idleMid };
    if (idleMid !== 0) fails.push(`idle at q0.8: ${idleMid} frames/s`);

    if (w === 1440) {
      // Soft navigation: the canvas stays mounted. With no hero it must not render; back home the bob resumes.
      const idleFor = async () => { await page.waitForTimeout(2000); const f = await frames(); await page.waitForTimeout(1000); return (await frames()) - f; };
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(1000);
      await page.evaluate(() => { window.__qaSoftNav = true; }); // a full reload would clear this
      await page.locator('a[href="/about"]').first().click();
      await page.waitForURL('**/about');
      if (!(await page.evaluate(() => window.__qaSoftNav === true))) fails.push('/about was not a soft navigation');
      const idleOther = await idleFor();
      await page.goBack();
      await page.waitForSelector('[data-scene-stage="seed"]', { state: 'attached' });
      const idleBack = await idleFor();
      // A locale switch may remount the layout; the cached GLB must come back and still scrub.
      await page.locator('a[href="/en"]').first().click();
      await page.waitForURL('**/en');
      await page.waitForSelector('html[data-seed="ready"]', { state: 'attached', timeout: 30000 });
      await page.waitForTimeout(1000);
      await at(0.6);
      await page.waitForTimeout(1500);
      const g = await geometry();
      const file = path.join(outDir, 'seed-after-locale@1440.png');
      await page.screenshot({ path: file });
      entry.navigation = { idleOther, idleBack, seedAfterLocale: round(g.seed, 2), canvases: await page.locator('canvas').count(), file };
      if (idleOther !== 0) fails.push(`idle on /about: ${idleOther} frames/s`);
      if (idleBack < 15 || idleBack > 45) fails.push(`idle back home: ${idleBack} frames/s`);
      if (Math.abs(g.seed - 0.6) > 0.05) fails.push(`after locale switch: store.seed=${round(g.seed, 2)}`);
      if (entry.navigation.canvases !== 1) fails.push(`after locale switch: ${entry.navigation.canvases} canvases`);
    }

    entry.pass = fails.length === 0;
    results.push(entry);
    await context.close();
  }
  // Reduced motion: no canvas, and the hero is one screen.
  {
    const { context, page } = await newPage(browser, 'seed reduced', { reducedMotion: 'reduce' });
    await page.goto(`${base}/`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => !!document.documentElement.dataset.tier, null, { timeout: 15000 });
    await page.waitForTimeout(1500);
    const s = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas:not([data-poster])').length, hero: document.querySelector('#hero').getBoundingClientRect().height, vh: innerHeight }));
    results.push({ reduced: true, ...s, pass: s.canvases === 0 && s.hero <= 1.15 * s.vh });
    await context.close();
  }
  // Lighthouse never reaches motion boot, so prove directly that the canvas path cannot delay the headline.
  // Ordering is asserted; the absolute numbers are for comparison (local HTTP/1.1 here, unlike the Lighthouse proxy).
  const lcpFor = async (tier, w, h) => {
    const { context, page } = await newPage(browser, `seed lcp ${tier}@${w}`, { viewport: { width: w, height: h } });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
    await page.addInitScript(() => {
      new PerformanceObserver((l) => {
        for (const e of l.getEntries()) window.__qaLcp = { t: e.startTime, tag: e.element?.tagName ?? null, inHero: !!e.element?.closest('#hero') };
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
    await page.goto(`${base}/?tier=${tier}`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForSelector(tier === 'full' ? 'html[data-seed="ready"]' : '[data-scene-stage="seed"][data-media="ready"]', { state: 'attached', timeout: 90000 });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({
      lcp: window.__qaLcp ?? null,
      glbStart: performance.getEntriesByType('resource').find((e) => e.name.endsWith('/seed.glb'))?.startTime ?? null,
    }));
    await context.close();
    return r;
  };
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const full = await lcpFor('full', w, h);
    const still = await lcpFor('still', w, h);
    const lite = await lcpFor('lite', w, h);
    // Lite frames and Still posters arrive late, so they must never become the LCP element: the hero copy stays LCP.
    const fallbackLcp = [still, lite].every((r) => r.lcp?.inHero && !['IMG', 'VIDEO', 'CANVAS'].includes(r.lcp.tag));
    const pass = !!full.lcp?.inHero && full.glbStart !== null && full.lcp.t < full.glbStart && fallbackLcp;
    results.push({ lcpOnCanvasPath: true, width: w, full, still, lite, deltaMs: full.lcp && still.lcp ? round(full.lcp.t - still.lcp.t) : null, fallbackLcp, pass });
  }
  return { results, pass: results.every((r) => r.pass) };
}

// ---- weave: budget, per-beat store + screenshots, text safety, frame, tiles, GPU idle, programs, UV chart, continuity ----
const WEAVE_BEATS = ['thread', 'warps', 'weave', 'drape', 'tote', 'mug', 'coaster'];
const WEAVE_SIZES = [[1440, 900], [375, 812], [768, 1024], [1024, 768]];

// Circle grid with an asymmetric F in every cell: circles show stretch, the F shows flips and mirroring. Never shipped.
async function weaveChart() {
  const n = 8, cell = 128;
  let g = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const ox = x * cell, oy = y * cell;
    g += `<circle cx="${ox + 64}" cy="${oy + 64}" r="54" fill="#f4d9d2" stroke="#3a2a40" stroke-width="4"/>`
      + `<rect x="${ox + 44}" y="${oy + 34}" width="14" height="60" fill="#3a2a40"/>`
      + `<rect x="${ox + 44}" y="${oy + 34}" width="42" height="14" fill="#3a2a40"/>`
      + `<rect x="${ox + 44}" y="${oy + 58}" width="30" height="12" fill="#3a2a40"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#fbf3ee"/>${g}</svg>`;
  return sharp(Buffer.from(svg)).webp({ quality: 90 }).toBuffer();
}

// Mean x of mint pixels in `rows` rows from y0.
async function mintCentroid(file, y0, rows = 6) {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  let sum = 0, n = 0;
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(info.height, Math.floor(y0) + rows); y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i + 1] - Math.max(data[i], data[i + 2]) >= 8) { sum += x; n++; }
    }
  }
  return n ? { x: sum / n, hits: n } : null;
}

// Pixels inside `rects` that differ between a shot with the scene and one without it.
async function pixelsDiffering(fileA, fileB, rects) {
  const [a, b] = await Promise.all([fileA, fileB].map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })));
  const { width, height, channels } = a.info;
  let hits = 0;
  for (const r of rects) {
    for (let y = Math.max(0, Math.floor(r.top)); y < Math.min(height, Math.ceil(r.bottom)); y++) {
      for (let x = Math.max(0, Math.floor(r.left)); x < Math.min(width, Math.ceil(r.right)); x++) {
        const i = (y * width + x) * channels;
        const d = Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]);
        if (d > 24) hits++;
      }
    }
  }
  return hits;
}

const weaveScrollTo = (page, beat, q) => page.evaluate(([b, k]) => {
  const st = window.__gieoMotion.ScrollTrigger.getById(`weave-${b}`);
  window.scrollTo(0, st.start + k * (st.end - st.start));
}, [beat, q]);

const weaveNear = (page) => page.evaluate(() => window.scrollTo(0, document.querySelector('[data-scene-stage="weave"]').getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4));

// Line rects of the text in the Meaning note, beat 1, the quote and beat 3.
const weaveTextRects = (page) => page.evaluate(() => {
  const stage = document.querySelector('[data-scene-stage="weave"]');
  const els = [document.querySelector('[data-thread-clear]'), ...[...stage.parentElement.children].filter((c) => c !== stage)];
  const out = [];
  for (const el of els) {
    const range = document.createRange();
    range.selectNodeContents(el);
    for (const r of range.getClientRects()) if (r.width > 1 && r.height > 1) out.push({ left: r.left, top: r.top, right: r.right, bottom: r.bottom });
  }
  return out;
});

const setCanvasHidden = (page, hidden) => page.evaluate((v) => { document.querySelector('canvas').closest('div[aria-hidden]').style.visibility = v ? 'hidden' : ''; }, hidden);

async function checkWeave(browser) {
  const results = [];
  for (const [w, h] of WEAVE_SIZES) {
    const { context, page } = await newPage(browser, `weave@${w}`, { viewport: { width: w, height: h } });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    const bytes = { glb: 0, cloth: 0 };
    const ids = new Map();
    cdp.on('Network.responseReceived', (e) => {
      if (e.response.url.endsWith('/weave.glb')) ids.set(e.requestId, 'glb');
      if (e.response.url.endsWith('/weave-cloth.webp')) ids.set(e.requestId, 'cloth');
    });
    cdp.on('Network.loadingFinished', (e) => { const k = ids.get(e.requestId); if (k) bytes[k] = e.encodedDataLength; });
    const entry = { width: w, bytes, programs: null, beats: [], textSafety: [], frame: null, tiles: [], idle: [], fails: [], pass: false };
    const fails = entry.fails;
    await page.goto(`${base}/?tier=full`, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    await page.waitForTimeout(1000);
    const programs = () => page.evaluate(() => window.__gieoGL.info.programs.length);
    const before = await programs();
    await weaveNear(page);
    await page.waitForSelector('html[data-weave="ready"]', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(500);
    entry.programs = { before, after: await programs() };
    if (!(bytes.glb > 0 && bytes.glb + bytes.cloth <= 1.2 * 1024 * 1024)) fails.push(`weave bytes ${bytes.glb}+${bytes.cloth}`);

    const frames = () => page.evaluate(() => window.__gieoGL.info.render.frame);
    const SAFE = new Set(['thread-0.5', 'warps-0.5', 'weave-1']);
    for (const beat of WEAVE_BEATS) {
      for (const q of [0.5, 1]) {
        if (!(await page.evaluate((b) => !!window.__gieoMotion.ScrollTrigger.getById(`weave-${b}`), beat))) { fails.push(`${beat}: no trigger`); continue; }
        await weaveScrollTo(page, beat, q);
        await page.waitForTimeout(1500);
        const value = await page.evaluate((b) => window.__gieoMotion.store.getState().weave[b], beat);
        const file = path.join(outDir, `weave-${beat}-${q}@${w}.png`);
        await page.screenshot({ path: file });
        const ok = Math.abs(value - q) <= 0.05;
        entry.beats.push({ beat, q, value: round(value, 2), ok, file });
        if (!ok) fails.push(`${beat}@${q}=${round(value, 2)}`);

        if (SAFE.has(`${beat}-${q}`)) {
          const rects = await weaveTextRects(page);
          await setCanvasHidden(page, true);
          await page.waitForTimeout(150);
          const bare = path.join(outDir, `weave-${beat}-${q}-bare@${w}.png`);
          await page.screenshot({ path: bare });
          await setCanvasHidden(page, false);
          const hits = await pixelsDiffering(file, bare, rects);
          entry.textSafety.push({ beat, q, rects: rects.length, hitPixels: hits });
          if (hits > 0) fails.push(`text safety ${beat}@${q}: ${hits} px`);
        }

        if (q === 0.5) {
          await page.waitForTimeout(500);
          const f0 = await frames();
          await page.waitForTimeout(1000);
          const delta = (await frames()) - f0;
          entry.idle.push({ beat, delta });
          if (delta !== 0) fails.push(`idle ${beat}: ${delta} frames/s`);
          if (w >= 1024 && ['tote', 'mug', 'coaster'].includes(beat)) {
            const active = await page.evaluate(() => [...document.querySelectorAll('#craft ul[role="list"] > li')].map((li) => li.dataset.active === 'true'));
            const want = ['tote', 'mug', 'coaster'].indexOf(beat);
            const exact = active.length === 3 && active.every((a, j) => a === (j === want));
            entry.tiles.push({ beat, active, ok: exact });
            if (!exact) fails.push(`tiles at ${beat}: ${active}`);
          }
        }
        if (beat === 'coaster' && q === 1) {
          const c = await page.evaluate(() => { const r = document.querySelector('[data-scene-stage="weave"]').getBoundingClientRect(); return { y: r.top + r.height / 2, vh: innerHeight }; });
          entry.frame = { centreY: round(c.y), minY: round(0.08 * c.vh), vh: c.vh };
          if (!(c.y >= 0.08 * c.vh && c.y <= c.vh)) fails.push(`coaster stage centre y=${round(c.y)}`);
        }
      }
    }
    if (w === 1440) {
      // Crossing the breakpoint reverts the wide beats; a lit tile must not survive it.
      await weaveScrollTo(page, 'mug', 0.5);
      await page.waitForTimeout(1500);
      await page.setViewportSize({ width: 900, height: h });
      await page.waitForTimeout(800);
      entry.tilesAfterResize = await page.evaluate(() => document.querySelectorAll('#craft ul[role="list"] > li[data-active]').length);
      if (entry.tilesAfterResize !== 0) fails.push(`${entry.tilesAfterResize} tile(s) still active after crossing 1024`);
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(800);
      // Leaving with a product on screen: the canvas outlives the page, so its next frame must draw nothing.
      await weaveScrollTo(page, 'tote', 1);
      await page.waitForTimeout(1500);
      await page.evaluate(() => { window.__qaSoftNav = true; });
      await page.locator('#craft a[href="/collections"]').click();
      await page.waitForURL('**/collections');
      await page.waitForTimeout(1500);
      entry.leaving = await page.evaluate(() => ({ soft: window.__qaSoftNav === true, drawCalls: window.__gieoGL.info.render.calls }));
      if (!entry.leaving.soft) fails.push('CTA was not a soft navigation');
      if (entry.leaving.drawCalls !== 0) fails.push(`ghost frame: ${entry.leaving.drawCalls} draw calls after leaving the page`);
    }
    entry.pass = fails.length === 0;
    results.push(entry);
    await context.close();
  }

  // Orientation and stretch: the real-scan swap path, with a chart that is never shipped.
  const chart = await weaveChart();
  const charts = [];
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const { context, page } = await newPage(browser, `weave chart@${w}`, { viewport: { width: w, height: h } });
    await page.route('**/models/weave-cloth.webp', (route) => route.fulfill({ status: 200, contentType: 'image/webp', body: chart }));
    await page.goto(`${base}/?tier=full`, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    await weaveNear(page);
    await page.waitForSelector('html[data-weave="ready"]', { state: 'attached', timeout: 30000 });
    for (const beat of ['tote', 'mug', 'coaster']) {
      await weaveScrollTo(page, beat, 1);
      await page.waitForTimeout(1500);
      const file = path.join(outDir, `weave-chart-${beat}@${w}.png`);
      await page.screenshot({ path: file });
      charts.push({ width: w, product: beat, file });
    }
    await context.close();
  }

  // Continuity: where the seed's thread leaves the frame vs where the weave's thread arrives (report only).
  const continuity = [];
  for (const [w, h] of [[1440, 900], [375, 812]]) {
    const { context, page } = await newPage(browser, `weave continuity@${w}`, { viewport: { width: w, height: h } });
    await page.goto(`${base}/?tier=full`, { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('html[data-seed="ready"]', { state: 'attached', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.evaluate(() => { const st = window.__gieoMotion.ScrollTrigger.getById('seed'); window.scrollTo(0, st.end); });
    await page.waitForTimeout(1500);
    const seedFile = path.join(outDir, `weave-continuity-seed@${w}.png`);
    await page.screenshot({ path: seedFile });
    const seedExit = await mintCentroid(seedFile, 0);
    await weaveNear(page);
    await page.waitForSelector('html[data-weave="ready"]', { state: 'attached', timeout: 30000 });
    await weaveScrollTo(page, 'thread', 1);
    await page.waitForTimeout(1500);
    const weaveFile = path.join(outDir, `weave-continuity-thread@${w}.png`);
    await page.screenshot({ path: weaveFile });
    const top = await page.evaluate(() => Math.max(0, document.querySelector('[data-scene-stage="weave"]').getBoundingClientRect().top));
    const arrive = await mintCentroid(weaveFile, top + 4);
    continuity.push({ width: w, seedExitX: seedExit && round(seedExit.x), weaveX: arrive && round(arrive.x),
      distancePx: seedExit && arrive ? round(Math.abs(seedExit.x - arrive.x)) : null, seedFile, weaveFile });
    await context.close();
  }
  return { results, charts, continuity, pass: results.every((r) => r.pass) };
}

// ---- fallback: Lite scrub video and Still posters (Phase 6, docs/03 §6) ----
const FALLBACK_SPANS = { seed: ['seed', 'seed'], weave: ['weave-thread', 'weave-coaster'], lotus: ['lotus-rise', 'lotus-finale'] };
const MP4_LIMIT = 3 * 1024 * 1024;

// Media and model requests, bytes summed per URL (a video arrives in several range requests).
async function trackMedia(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  const ids = new Map();
  const bytes = new Map();
  cdp.on('Network.requestWillBeSent', (e) => {
    const u = e.request.url;
    if (/\.glb(\?|$)|\/video\/|\/posters\//.test(u)) { ids.set(e.requestId, u); if (!bytes.has(u)) bytes.set(u, 0); }
  });
  cdp.on('Network.loadingFinished', (e) => { const u = ids.get(e.requestId); if (u) bytes.set(u, bytes.get(u) + e.encodedDataLength); });
  return { urls: () => [...bytes.keys()], bytes };
}

const sceneOfUrl = (u) => u.match(/\/(?:video|posters)\/(seed|weave|lotus)[-.]/)?.[1] ?? null;

const waitHook = (page) => page.waitForFunction(() => !!window.__gieoMotion, null, { timeout: 30000 });
const sceneT = (page, scene) => page.evaluate((s) => window.__gieoMotion.timeOf(s, window.__gieoMotion.store.getState()), scene);
const waitMedia = async (page, scene, timeout = 10000) => {
  const t0 = Date.now();
  try {
    await page.waitForFunction((s) => document.querySelector(`[data-scene-stage="${s}"]`)?.dataset.media === 'ready', scene, { timeout });
    return Date.now() - t0;
  } catch {
    return null;
  }
};
const setMediaHidden = (page, scene, hidden) => page.evaluate(([s, v]) => {
  const box = document.querySelector(`[data-scene-stage="${s}"] .scene-media`);
  if (box) box.style.visibility = v ? 'hidden' : '';
}, [scene, hidden]);
const mediaState = (page, scene) => page.evaluate((s) => {
  const stage = document.querySelector(`[data-scene-stage="${s}"]`);
  const box = stage?.querySelector('.scene-media');
  const posters = box ? [...box.querySelectorAll('[data-poster]')] : [];
  const r = box?.getBoundingClientRect();
  return {
    frame: box?.querySelector('canvas:not([data-poster])')?.dataset.frame ?? null,
    canvases: stage ? stage.querySelectorAll('canvas:not([data-poster])').length : 0,
    key: box?.dataset.key ?? null,
    opaque: posters.filter((i) => getComputedStyle(i).opacity === '1').length,
    posters: posters.length,
    ready: stage?.dataset.media === 'ready',
    box: r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null,
  };
}, scene);
const heroTextRects = (page) => page.evaluate(() => {
  const range = document.createRange();
  range.selectNodeContents(document.querySelector('[data-hero-drift]'));
  return [...range.getClientRects()].filter((r) => r.width > 1 && r.height > 1)
    .map((r) => ({ left: r.left, top: r.top, right: r.right, bottom: r.bottom }));
});

// Largest single-channel difference inside `rects`.
async function maxChannelDiff(fileA, fileB, rects) {
  const [a, b] = await Promise.all([fileA, fileB].map((f) => sharp(f).raw().toBuffer({ resolveWithObject: true })));
  const { width, height, channels } = a.info;
  let max = 0;
  for (const r of rects) {
    for (let y = Math.max(0, Math.floor(r.top)); y < Math.min(height, Math.ceil(r.bottom)); y++) {
      for (let x = Math.max(0, Math.floor(r.left)); x < Math.min(width, Math.ceil(r.right)); x++) {
        const i = (y * width + x) * channels;
        for (let c = 0; c < 3; c++) max = Math.max(max, Math.abs(a.data[i + c] - b.data[i + c]));
      }
    }
  }
  return max;
}

// Squares just inside the box's 6% feather where the scene has nothing: the video's background must be fully transparent there.
// The weave's warps come in over the top corners mid-scene, so only its bottom corners are empty.
const CLEAR_CORNERS = {
  seed: [[0.07, 0.07], [0.83, 0.07], [0.07, 0.83], [0.83, 0.83]],
  weave: [[0.07, 0.83], [0.83, 0.83]],
  lotus: [[0.07, 0.07], [0.83, 0.07], [0.07, 0.83], [0.83, 0.83]],
};
const boxCorners = (scene, { left, top, width: w, height: h }) => CLEAR_CORNERS[scene]
  .map(([fx, fy]) => ({ left: left + fx * w, top: top + fy * h, right: left + (fx + 0.1) * w, bottom: top + (fy + 0.1) * h }));

async function checkFallback(browser) {
  const results = [];
  for (const tier of ['lite', 'still']) {
    for (const [w, h] of [[1440, 900], [375, 812]]) {
      const { context, page } = await newPage(browser, `fallback ${tier}@${w}`, { viewport: { width: w, height: h } });
      const scripts = await trackScripts(page);
      const media = await trackMedia(page);
      const entry = { tier, width: w, points: [], ready: {}, transparency: [], textSafety: [], fails: [], pass: false };
      const fails = entry.fails;
      await loadAndSettle(page, `${base}/?tier=${tier}`, scripts);
      await waitHook(page);
      await page.waitForTimeout(1000);

      // 1. Media only for near stages; nothing for the lotus at the top of the page.
      const near = await page.evaluate(() => window.__gieoMotion.store.getState().near);
      entry.topRequests = media.urls();
      const early = [...new Set(entry.topRequests.map(sceneOfUrl).filter(Boolean))].filter((s) => !near[s]);
      if (early.length) fails.push(`media requested before near: ${early}`);
      if (entry.topRequests.some((u) => sceneOfUrl(u) === 'lotus')) fails.push('lotus media requested at the top of the page');

      for (const scene of ['seed', 'weave', 'lotus']) {
        const span = await page.evaluate(([a, b]) => {
          const ST = window.__gieoMotion.ScrollTrigger;
          const s = ST.getById(a), e = ST.getById(b);
          return s && e ? [s.start, e.end] : null;
        }, FALLBACK_SPANS[scene]);
        if (!span) { fails.push(`${scene}: no trigger`); continue; }
        for (let i = 0; i < 5; i++) {
          await page.evaluate((y) => window.scrollTo(0, y), span[0] + (i / 4) * (span[1] - span[0]));
          // 6. Every near stage is ready within 10 s of being reached.
          if (i === 0) {
            entry.ready[scene] = await waitMedia(page, scene);
            if (entry.ready[scene] === null) fails.push(`${scene}: data-media not ready within 10 s`);
          }
          await page.waitForTimeout(1500);
          const t = await sceneT(page, scene);
          const m = await mediaState(page, scene);
          const file = path.join(outDir, `${tier}-${scene}-${i}@${w}.png`);
          await page.screenshot({ path: file });
          const point = { scene, i, t: round(t, 3), file };
          // 2. The shown frame or key follows the timeline.
          if (tier === 'lite') {
            point.frame = m.frame === null ? null : Number(m.frame);
            point.want = frameAt(scene, t);
            if (point.frame === null || Math.abs(point.frame - point.want) > 1) fails.push(`${scene}@${i}: frame ${point.frame}, want ${point.want}`);
          } else {
            point.key = m.key;
            point.want = keyAt(scene, t);
            point.opaque = m.opaque;
            if (m.opaque !== 1 || m.key !== String(point.want)) fails.push(`${scene}@${i}: key ${m.key} (${m.opaque} opaque), want ${point.want}`);
          }
          entry.points.push(point);

          // 3. At the middle point the media is really drawn (a blank canvas or a missing poster would pass the
          // checks above), and in Lite the box's empty corners show the page exactly as without the media.
          if (i === 2 && m.box) {
            await setMediaHidden(page, scene, true);
            await page.waitForTimeout(150);
            const bare = path.join(outDir, `${tier}-${scene}-${i}-bare@${w}.png`);
            await page.screenshot({ path: bare });
            await setMediaHidden(page, scene, false);
            const { left, top, width: bw, height: bh } = m.box;
            const drawn = await pixelsDiffering(file, bare, [{ left, top, right: left + bw, bottom: top + bh }]);
            const max = tier === 'lite' ? await maxChannelDiff(file, bare, boxCorners(scene, m.box)) : null;
            entry.transparency.push({ scene, drawnPixels: drawn, maxChannelDiff: max });
            if (drawn < 2000) fails.push(`${scene}: media drew only ${drawn} px`);
            if (max > 2) fails.push(`${scene}: corner diff ${max}`);
          }

          // 4. Text safety: the media never paints over copy.
          if ((scene === 'weave' && i <= 2) || (scene === 'seed' && i === 4)) {
            const rects = scene === 'weave' ? await weaveTextRects(page) : await heroTextRects(page);
            await setMediaHidden(page, scene, true);
            await page.waitForTimeout(150);
            const bare = path.join(outDir, `${tier}-${scene}-${i}-text-bare@${w}.png`);
            await page.screenshot({ path: bare });
            await setMediaHidden(page, scene, false);
            const hits = await pixelsDiffering(file, bare, rects);
            entry.textSafety.push({ scene, i, rects: rects.length, hitPixels: hits });
            if (hits > 0) fails.push(`text safety ${scene}@${i}: ${hits} px`);
          }
        }
      }

      // 1. No models, no three.js, each mp4 within budget.
      const j = await scripts.result();
      entry.threeChunks = j.threeChunks;
      entry.mediaBytes = Object.fromEntries(media.bytes);
      if (j.threeChunks.length) fails.push(`three.js chunk requested: ${j.threeChunks}`);
      if (media.urls().some((u) => /\.glb(\?|$)/.test(u))) fails.push('a .glb was requested');
      for (const [u, b] of media.bytes) if (u.includes('.mp4') && b > MP4_LIMIT) fails.push(`${u}: ${round(b / 1048576, 2)} MB`);
      if (tier === 'still' && media.urls().some((u) => u.includes('/video/'))) fails.push('still tier requested a video');
      entry.pass = fails.length === 0;
      results.push(entry);
      await context.close();
    }
  }

  // 5. A failed video falls back to posters for that scene only.
  let failure;
  {
    const { context, page } = await newPage(browser, 'fallback video-error');
    const before = errors.length;
    await page.route('**/video/weave.mp4', (route) => route.abort());
    const scripts = await trackScripts(page);
    await loadAndSettle(page, `${base}/?tier=lite`, scripts);
    await waitHook(page);
    await weaveNear(page);
    const readyMs = await waitMedia(page, 'weave');
    await page.waitForTimeout(500);
    const m = await mediaState(page, 'weave');
    failure = { readyMs, posters: m.posters, canvases: m.canvases, ready: m.ready, pass: m.posters > 0 && m.ready && m.canvases === 0 };
    await context.close();
    // The aborted request is the test itself; any other error from this page still fails the run.
    const own = errors.splice(before).filter((e) => !/video-error: console: Failed to load resource: net::ERR_FAILED/.test(e));
    errors.push(...own);
  }
  return { results, failure, pass: results.every((r) => r.pass) && failure.pass };
}

// ---- lowtier: Lite on a 4× throttled phone, touch scroll top to bottom (report even on fail) ----
async function checkLowTier(browser) {
  const { context, page } = await newPage(browser, 'lowtier', { viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const cdp = await context.newCDPSession(page);
  const scripts = await trackScripts(page);
  await loadAndSettle(page, `${base}/?tier=lite`, scripts);
  await waitHook(page);
  const seedReadyMs = await waitMedia(page, 'seed');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__qaLong = [];
    new PerformanceObserver((l) => window.__qaLong.push(...l.getEntries().map((e) => e.duration))).observe({ type: 'longtask' });
  });
  const max = await scrollMax(page);
  const DURATION = 10000;
  const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints });
  await startSampler(page);
  const began = Date.now();
  // Strokes of up to 700 px (the touch group's real touch points), paced so the page is covered in about 10 s.
  for (;;) {
    const y = await scrollY(page);
    const elapsed = Date.now() - began;
    if (y >= max - 2 || elapsed > 2 * DURATION) break;
    const ahead = y - (max * elapsed) / DURATION;
    if (ahead > 0) { await sleep(Math.min(500, (ahead / max) * DURATION)); continue; }
    const dist = Math.min(700, max - y);
    await send('touchStart', [{ x: 187, y: 760 }]);
    for (let i = 1; i <= 30; i++) {
      await send('touchMove', [{ x: 187, y: 760 - (i * dist) / 30 }]);
      await sleep(16);
    }
    await send('touchEnd', []);
  }
  const scrollMs = Date.now() - began;
  await page.waitForTimeout(500);
  const stats = frameStats(await stopSampler(page));
  const long = await page.evaluate(() => window.__qaLong);
  const finalProgress = round((await scrollY(page)) / max, 3);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await context.close();
  return { seedReadyMs, scrollMs, finalProgress, ...stats, longTaskCount: long.length, longTaskMaxMs: round(Math.max(0, ...long)),
    pass: seedReadyMs !== null && long.length === 0 && stats.over50 === 0 };
}

// ---- run ----
const browser = await launchBrowser();
const report = { base, generatedAt: new Date().toISOString(), only, webgl: null, checks: {}, errors, pass: false };

try {
  const probe = await newPage(browser, 'probe');
  await probe.page.goto('about:blank');
  report.webgl = await webglInfo(probe.page);
  report.webgl.software = !report.webgl.webgl2 || /swiftshader|llvmpipe|software/i.test(report.webgl.renderer || '');
  await probe.context.close();
  console.log(`[qa] WebGL renderer: ${report.webgl.renderer}${report.webgl.software ? '  (SOFTWARE GL: frame numbers are not representative)' : ''}`);

  const runners = { trace: checkTrace, keys: checkKeys, touch: checkTouch, tiers: checkTiers, scenes: checkScenes, lotus: checkLotus, seed: checkSeed, weave: checkWeave,
    reveal: checkReveal, webgl: checkWebglFailure, parallax: checkParallax, fallback: checkFallback, lowtier: checkLowTier };
  for (const g of GROUPS) {
    if (!wants(g)) continue;
    try {
      report.checks[g] = await runners[g](browser);
    } catch (err) {
      report.checks[g] = { pass: false, error: err.message.split('\n')[0] };
    }
    console.log(`[qa] ${g}: ${report.checks[g].pass ? 'PASS' : 'FAIL'}`);
  }
} finally {
  await browser.close();
}

report.pass = errors.length === 0 && Object.values(report.checks).every((c) => c.pass);
const reportFile = path.join(outDir, only ? `motion-report-${only}.json` : 'motion-report.json');
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

const t = report.checks.trace;
if (t && !t.error) {
  console.log(`[qa] trace: scroll ${t.scrollMs}ms, progress ${t.finalProgress}, long tasks ${t.longTaskCount} (max ${t.longTaskMaxMs}ms), `
    + `frames ${t.frames}, max ${t.maxFrameMs}ms, >33.4ms ${t.over33_4}, p95 ${t.p95Ms}ms`);
}
const b = report.checks.tiers?.budget;
if (b) console.log(`[qa] js: ${b.totalKB} KB total, ${b.excludingThreeKB} KB excluding three and R3F, ${b.withR3fKB} KB counting R3F (limit ${b.limitKB})`);
for (const e of errors) console.log(`[qa] ERROR ${e}`);
console.log(`[qa] report: ${reportFile}${report.pass ? 'PASS' : 'FAIL'}  errors=${errors.length}`);
process.exit(report.pass ? 0 : 1);
