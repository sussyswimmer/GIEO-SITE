import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import type { SceneName } from '@/components/ui/SceneStage';
import {
  DRAW_START,
  ENTER_SCALE,
  LENIS_OPTIONS,
  PARALLAX_PERCENT,
  PARALLAX_SCALE,
  REVEAL_START,
  HERO_GHOST_TOP,
  SCRUB,
  THREAD_TIP,
} from './motion';
import { beatsAt, timeOf, TRACKS, WEAVE_PACE, weaveRun } from './fallback-timeline';
import { coverPoint, type FilmManifest, type FilmSet } from './film';
import { useMotionStore, type WeaveBeat } from './motion-store';
import { mountClips } from './scrub-clip';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

let lenis: Lenis | null = null;

type Step = () => void;

/**
 * Boot is time-sliced (PROGRESS 2026-11-24): built in one go, the page's triggers, split headings and
 * scenes held the main thread 400 to 900 ms on a phone at 4x CPU, so a first tap could freeze. Steps run
 * in their original order, a few at a time, and hand the thread back between slices.
 */
const SLICE_MS = 8;
const yieldToMain = (): Promise<void> => {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (s?.yield) return s.yield();
  // Safari and Firefox: a message hop, which (unlike setTimeout) is never clamped to 4 ms.
  return new Promise((resolve) => {
    const { port1, port2 } = new MessageChannel();
    port1.onmessage = () => resolve();
    port2.postMessage(null);
  });
};

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// The production CSS minifier rewrites 700ms as .7s, so the unit has to be read.
const seconds = (name: string) => {
  const value = token(name);
  return parseFloat(value) / (value.endsWith('ms') ? 1000 : 1);
};
const belowFold = (el: Element) => el.getBoundingClientRect().top > window.innerHeight;
const all = <T extends Element = HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];

// One boot step per heading: splitting a heading into lines lays it out, about 10 ms each on a slow phone.
function revealSteps(): Step[] {
  const y = parseFloat(token('--reveal-distance'));
  const duration = seconds('--dur-reveal');
  const stagger = seconds('--stagger');
  return all('main h2').map((el) => () => {
    if (!belowFold(el)) return; // never hide text the reader can already see
    SplitText.create(el, {
      type: 'lines',
      tag: 'span',
      linesClass: 'block', // a transform does nothing on an inline span
      aria: 'none',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          y,
          opacity: 0,
          duration,
          stagger,
          ease: 'expo.out', // ≈ --curve-out
          // What follows the kinetic band must not wait: the band is decoration, and with these headings
          // still held back the screen where the pillars leave had nothing to read on its lower third.
          scrollTrigger: { trigger: el, start: el.closest('#vision-mission') ? 'top bottom' : REVEAL_START, once: true },
          // revert() kills the resize/font observers first, so the heading ends as plain text.
          onComplete: () => self.revert(),
        }),
    });
  });
}

function drawSteps(): Step[] {
  return all<SVGPathElement>('svg[data-draw="view"] path').map((path) => () => {
    if (!belowFold(path)) return;
    gsap.fromTo(
      path,
      { strokeDashoffset: 1 },
      {
        strokeDashoffset: 0,
        duration: seconds('--dur-draw'),
        ease: 'expo.out',
        scrollTrigger: { trigger: path, start: DRAW_START, once: true },
      },
    );
  });
}

// One boot step per element: each trigger measures its box as it is created.
function parallaxSteps(): Step[] {
  const steps: Step[] = [];
  const each = (selector: string, fn: (el: HTMLElement) => void) => all(selector).forEach((el) => steps.push(() => fn(el)));
  each('[data-parallax]', (inner) => {
    const frame = inner.parentElement!;
    gsap.fromTo(
      inner,
      { yPercent: -PARALLAX_PERCENT, scale: PARALLAX_SCALE },
      {
        yPercent: PARALLAX_PERCENT,
        ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: SCRUB },
      },
    );
    if (belowFold(frame))
      gsap.from(frame, {
        opacity: 0,
        scale: ENTER_SCALE,
        duration: seconds('--dur-reveal'),
        ease: 'expo.out',
        scrollTrigger: { trigger: frame, start: REVEAL_START, once: true },
      });
  });
  // Layers that drift against the page: data-drift is the travel each way, in % of the parent's height.
  each('[data-drift]', (el) => {
    const box = el.parentElement!;
    const reach = () => (Number(el.dataset.drift) / 100) * box.offsetHeight;
    gsap.fromTo(
      el,
      { y: () => -reach() },
      {
        y: reach,
        ease: 'none',
        scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: SCRUB, invalidateOnRefresh: true },
      },
    );
  });
  // Sideways bands, of type or of still-lifes: each slides by a third of its own width as it crosses the
  // screen; data-band="reverse" runs the other way.
  each('[data-band]', (band) => {
    const [from, to] = band.dataset.band === 'reverse' ? [-38, -4] : [-4, -38];
    gsap.fromTo(
      band,
      { xPercent: from },
      { xPercent: to, ease: 'none', scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: SCRUB } },
    );
  });
  // A full-bleed picture settles as it crosses the screen (docs/08 H3: 1.08 → 1). Its wrapper clips it.
  each('[data-zoom]', (el) => {
    gsap.fromTo(
      el,
      { scale: 1.08 },
      { scale: 1, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: SCRUB } },
    );
  });
  return steps;
}

// Stitches and still-lifes are visible by default; only the ones still below the fold are held back to sew in.
function mountEnters(): () => void {
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.setAttribute('data-enter', 'in');
        io.unobserve(e.target);
      }),
    { rootMargin: '0px 0px -8% 0px' },
  );
  // A still is fetched and decoded a screen and a half before it unveils. Left to lazy loading it arrived
  // after the wipe (the clip hides it from the browser's own proximity check) and its first paint dropped a frame.
  const ahead = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        ahead.unobserve(e.target);
        e.target.querySelectorAll('img').forEach((img) => {
          img.loading = 'eager';
          img.decode().catch(() => {});
        });
      }),
    { rootMargin: '0px 0px 150% 0px' },
  );
  const held = all('[data-enter]').filter(belowFold);
  held.forEach((el) => {
    el.setAttribute('data-enter', 'pending');
    io.observe(el);
    ahead.observe(el);
  });
  return () => {
    io.disconnect();
    ahead.disconnect();
    held.forEach((el) => el.setAttribute('data-enter', ''));
  };
}

function mountTilt(signal: AbortSignal) {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const max = parseFloat(token('--tilt-max'));
  all('[data-tilt]').forEach((el) => {
    gsap.set(el, { transformPerspective: 1000 });
    const opts = { duration: 0.4, ease: 'power3.out' };
    const rotX = gsap.quickTo(el, 'rotationX', opts);
    const rotY = gsap.quickTo(el, 'rotationY', opts);
    let rect = el.getBoundingClientRect();
    el.addEventListener('pointerenter', () => (rect = el.getBoundingClientRect()), { signal });
    el.addEventListener(
      'pointermove',
      (e) => {
        const nx = (e.clientX - rect.left) / rect.width - 0.5;
        const ny = (e.clientY - rect.top) / rect.height - 0.5;
        // A full-width row at the full angle would swing its edges far; scale to a 420 px card.
        const yMax = max * Math.min(1, 420 / rect.width);
        rotY(nx * 2 * yMax);
        rotX(-ny * 2 * max);
      },
      { signal },
    );
    el.addEventListener(
      'pointerleave',
      () => {
        rotX(0);
        rotY(0);
      },
      { signal },
    );
  });
}

// The triggers below write scroll position into the store on every tier; film-stage.ts turns it into frames
// (scrubbed video on Full and Lite, the nearest key still on Still). Only the `reduced` branches move HTML.

// The Sow pin, in shares of its run. The film rests while something is being read and moves while one
// thing gives way to the next: the seed hangs in the air under the headline, falls and sprouts as the
// dictionary entry arrives, and grows into the thread on the way to the initiative line.
const HERO_FILM: [until: number, frame: number][] = [[0.1, 0], [0.3, 95], [0.47, 95], [0.76, 149], [1, 149]];
const HERO_WORD = [0.12, 0.24]; // the headline is whole until the first, gone by the second
const HERO_BEATS: [shown: number, until: number][] = [[0.29, 0.45], [0.55, 0.67], [0.77, 1]];
const HERO_FADE = 0.04;
// The seam (docs/08 H1). In the last stretch of the pin the ground lifts by this share of the screen, as if
// the camera went under it, and what it uncovers is already plum.
const HERO_LIFT = 0.15;
const HERO_SINK = [0.78, 0.9]; // the soil darkens into plum between these
// Where the yarn hangs from the top of the weave canvas in the film's first frame, as a share of the canvas
// width (film/weave/keys/s-0000.webp). The hero's main root and the page thread both run to it.
const YARN_X = 0.535;
const yarnX = () => {
  const r = document.querySelector('#craft [data-film]')?.getBoundingClientRect();
  return r && r.left + YARN_X * r.width;
};

/** S0. One scrub across the whole Sow pin; the headline shrinks to a ghost before the first beat takes its corner. */
function mountSow(reduced: boolean): () => void {
  const proxy = { p: 0 };
  const film = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { id: 'seed', trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: SCRUB },
    onUpdate: () => useMotionStore.setState({ seed: proxy.p }),
  });
  if (reduced) {
    film.to(proxy, { p: 1 }); // no pin: the copy is in flow, the headline just scrolls away and the film runs straight
    return () => {};
  }
  const last = TRACKS.seed.frames - 1;
  HERO_FILM.forEach(([until, frame], i) => film.to(proxy, { p: frame / last, duration: until - (HERO_FILM[i - 1]?.[0] ?? 0) }));
  const hero = document.querySelector<HTMLElement>('#hero')!;
  const stage = hero.querySelector<HTMLElement>('[data-film]')!;
  const word = hero.querySelector<HTMLElement>('[data-hero-word]')!;

  // The film's textSafe box as the stage shows it (the same cover fit), for the CSS that lays the beats out in it.
  let sets: FilmSet[] = [];
  const safe = () => {
    const set = sets.find((s) => s.id === stage.dataset.set);
    if (!set?.textSafe) return;
    const [x, y] = coverPoint(set, stage.clientWidth, stage.clientHeight, [set.textSafe[2], set.textSafe[3]]);
    hero.style.setProperty('--safe-x', `${x}px`);
    hero.style.setProperty('--safe-y', `${y}px`);
    roots(set);
  };
  // The roots, in the lifted ground's own box: from where the sprout stands (the set's `root`, cover-fitted
  // like the film) down to the foot of the screen as it is once the ground has lifted. The main one ends
  // under the weave film's yarn, where the page thread takes over (mountThread uses the same x); the
  // others wander off and fade. All are drawn by --root (globals.css), which the pin's timeline scrubs.
  const svg = hero.querySelector<SVGSVGElement>('[data-hero-roots]');
  const roots = (set: FilmSet) => {
    if (!svg) return;
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const [ox, oy] = coverPoint(set, w, h, set.root ?? [set.focus?.[0] ?? 0.5, 0.84]);
    const ex = yarnX() ?? ox;
    const ey = h * (1 + HERO_LIFT) + 4; // a few px past the foot, over the start of the page thread: no gap between the two
    const u = ey - oy;
    const d = ex < ox ? -1 : 1; // the side the main root leans to; the others keep clear of it
    const n = (v: number) => v.toFixed(1);
    const c = (x0: number, y0: number, dx1: number, dy1: number, dx2: number, dy2: number, dx: number, dy: number) =>
      `M${n(x0)} ${n(y0)}C${n(x0 + dx1 * u)} ${n(y0 + dy1 * u)} ${n(x0 + dx2 * u)} ${n(y0 + dy2 * u)} ${n(x0 + dx * u)} ${n(y0 + dy * u)}`;
    const side = [
      c(ox - 3 * d, oy + 4, -0.06 * d, 0.3, -0.4 * d, 0.36, -0.5 * d, 0.82),
      c(ox - 5 * d, oy + 2, -0.3 * d, 0.1, -0.62 * d, 0.3, -0.92 * d, 0.5),
      c(ox + (ex - ox) * 0.352, oy + 0.424 * u, 0.2 * d, 0.14, 0.38 * d, 0.2, 0.52 * d, 0.5), // leaves the main root at t = 0.4
      c(ox + 2 * d, oy + 4, 0.1 * d, 0.12, 0.2 * d, 0.2, 0.22 * d, 0.34),
    ];
    const grad = (id: string, stops: string) =>
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${n(oy)}" x2="0" y2="${n(ey)}">${stops}</linearGradient>`;
    const stop = (at: number, color: string, a: number) => `<stop offset="${at}" style="stop-color:var(--${color});stop-opacity:${a}"/>`;
    svg.innerHTML =
      `<defs>${grad('root-main', stop(0, 'stem-mint', 0) + stop(0.3, 'stem-mint', 1))}` +
      `${grad('root-side', stop(0.08, 'cream', 0) + stop(0.4, 'cream', 0.5) + stop(0.9, 'cream', 0))}</defs>` +
      side.map((p) => `<path pathLength="1" d="${p}" stroke="url(#root-side)" stroke-width="1.25"/>`).join('') +
      `<path pathLength="1" d="M${n(ox)} ${n(oy)}C${n(ox)} ${n(oy + 0.5 * u)} ${n(ex)} ${n(ey - 0.5 * u)} ${n(ex)} ${n(ey)}" stroke="url(#root-main)" stroke-width="2"/>`;
  };
  // The player has this manifest too, but keeps it to itself; the second request comes from the HTTP cache.
  fetch('/film/seed/manifest.json')
    .then((r) => (r.ok ? (r.json() as Promise<FilmManifest>) : (void r.body?.cancel(), null)))
    .then((m) => {
      sets = m?.sets ?? [];
      safe();
    })
    .catch(() => {});
  window.addEventListener('gieo:film', safe);
  ScrollTrigger.addEventListener('refresh', safe);

  // The same query as the CSS pin (globals.css), kept live: a rotated phone must not keep one without the other.
  const mm = gsap.matchMedia();
  mm.add('(min-height: 37.5rem)', () => {
    // The CSS entrance has long finished; while it fills it would hold the transform GSAP is about to drive.
    gsap.set('[data-hero-word], [data-hero-fade]', { animation: 'none' });
    // The word shrinks away under the nav and is gone before the first beat arrives in the same corner.
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
    });
    const [whole, gone] = HERO_WORD;
    // autoAlpha: the two buttons must leave the tab order with the first screen
    tl.to('[data-hero-fade]', { autoAlpha: 0, duration: HERO_FADE }, whole).to(
      word,
      { scale: 0.42, opacity: 0, y: () => Math.min(0, HERO_GHOST_TOP - word.offsetTop), transformOrigin: '0 0', duration: gone - whole },
      whole,
    );
    all('[data-hero-beat]').forEach((beat, i) => {
      const [shown, until] = HERO_BEATS[i];
      tl.fromTo(beat, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: HERO_FADE }, shown - HERO_FADE);
      if (until < 1) tl.to(beat, { opacity: 0, y: -12, duration: HERO_FADE }, until);
    });
    // Going under (docs/08 H1): the soil darkens into plum, then the ground lifts while the roots grow down
    // to the foot of the screen. The lift eases in over just the stretch that ends it at the page's own
    // speed (a quadratic ends at 2 × distance / time), so the pin lets go without a change of pace.
    const run = hero.offsetHeight - window.innerHeight;
    const lift = Math.min(0.2, (2 * HERO_LIFT * stage.clientHeight) / Math.max(1, run));
    tl.fromTo('[data-hero-sink]', { opacity: 0 }, { opacity: 1, duration: HERO_SINK[1] - HERO_SINK[0] }, HERO_SINK[0])
      .fromTo('[data-hero-ground]', { yPercent: 0 }, { yPercent: -100 * HERO_LIFT, ease: 'power2.in', duration: lift }, 1 - lift)
      .fromTo('[data-hero-roots]', { '--root': 1 }, { '--root': 0, duration: lift }, 1 - lift);
    tl.to({}, { duration: 0.001 }, 0.999); // so the timeline spans the whole run
  });
  return () => {
    mm.revert();
    window.removeEventListener('gieo:film', safe);
    ScrollTrigger.removeEventListener('refresh', safe);
    hero.style.removeProperty('--safe-x');
    hero.style.removeProperty('--safe-y');
    svg?.replaceChildren();
  };
}

/**
 * S1. The film runs thread → cloth against the copy's scroll, then tote → mug → coaster against the product
 * run (docs/08 H2). Scroll maps to the film piecewise, the film itself is not re-timed: each product is made
 * over `change` svh and then rests on its last frame for `hold` svh (WEAVE_PACE) while its name is lit and
 * the stage sways a little, so a rest is never dead. Where nothing pins (reduced motion, a short screen)
 * the three share the stage box's climb to the top of the screen instead.
 */
function mountWeave(reduced: boolean): () => void {
  const { beats, weights } = TRACKS.weave;
  const made = weights.slice(0, 4).reduce((a, b) => a + b, 0); // thread, warps, weave, drape
  const total = weights.reduce((a, b) => a + b, 0);
  const craft = document.querySelector<HTMLElement>('#craft')!;
  const run = craft.querySelector<HTMLElement>('[data-weave-run]') ?? craft;
  const box = craft.querySelector<HTMLElement>('[data-seam]') ?? craft; // the stage's box
  const names = run.querySelector<HTMLElement>('[data-weave-names]');
  const tiles = all('#craft ul[role="list"] > li');
  const credit = craft.querySelector<HTMLElement>('[data-credit]');
  const wide = matchMedia('(min-width: 64rem)');
  const pace = () => (wide.matches ? WEAVE_PACE.wide : WEAVE_PACE.phone);
  const v = { cloth: 0, p0: 0, p1: 0, p2: 0 };
  const push = () => {
    const now = [...beatsAt('weave', (made * v.cloth) / total).slice(0, 4), v.p0, v.p1, v.p2];
    useMotionStore.setState({ weave: Object.fromEntries(beats.map((b, i) => [b, now[i]])) as Record<WeaveBeat, number> });
    credit?.toggleAttribute('data-on', now[3] > 0); // from the drape: the cloth is becoming a product
    tiles.forEach((li, i) => {
      // A name is lit from the moment its product is more in than out, until the next one is.
      const on = now[4 + i] >= 0.5 && (now[5 + i] ?? 0) < 0.5;
      if ((li.dataset.active === 'true') === on) return; // written only on change
      if (on) li.dataset.active = 'true';
      else delete li.dataset.active;
    });
  };

  // The run's length for this screen, set before ScrollTrigger measures. The CSS spends it only where the
  // names pin (globals.css: a block after them), which is also how the triggers below know whether anything pins.
  const size = () => run.style.setProperty('--weave-run', `${weaveRun(pace())}svh`);
  size();
  ScrollTrigger.addEventListener('refreshInit', size);
  const y = (el: Element, edge: 'top' | 'bottom') => el.getBoundingClientRect()[edge] + window.scrollY;
  // The scroll position `svh` after the names stick; with nothing pinned, share k of the stage box's climb
  // from 60 % of the screen to its top.
  const point = (svh: number, k: number) => {
    const unit = (parseFloat(getComputedStyle(run, '::after').height) || 0) / weaveRun(pace()); // px per svh, 0 unpinned
    if (unit && names) return y(run, 'top') - (parseFloat(getComputedStyle(names).top) || 0) + svh * unit;
    const from = y(box, 'top') - 0.6 * window.innerHeight; // the stage is whole on screen from here to its top at 0
    return from + k * 0.6 * window.innerHeight;
  };
  // Product i is made between mark(i, 0) and mark(i, 1), and rests from there to mark(i + 1, 0).
  const mark = (i: number, done: 0 | 1) => () => {
    const { hold, change } = pace();
    return point(i * (hold + change) - (done ? 0 : change), (i + done) / 3);
  };
  const scrub = (vars: gsap.TweenVars, scrollTrigger: ScrollTrigger.Vars) =>
    gsap.to(v, { ...vars, ease: 'none', scrollTrigger: { scrub: SCRUB, ...scrollTrigger }, onUpdate: push });
  scrub({ cloth: 1 }, { id: 'weave', trigger: craft, start: 'top 80%', end: mark(0, 0) });
  [0, 1, 2].forEach((i) => scrub({ [`p${i}`]: 1 }, { trigger: run, start: mark(i, 0), end: mark(i, 1) }));

  const stage = craft.querySelector<HTMLElement>('[data-film]');
  if (!reduced && stage) {
    // While a product rests the stage still answers the scroll: a slow sway, 6 px and under a degree each way.
    // Custom properties, not rotation/y: GSAP would fold the stage's CSS `translate` into an inline transform.
    gsap
      .timeline({
        defaults: { ease: 'sine.inOut' },
        scrollTrigger: { trigger: run, start: mark(0, 1), end: () => point(weaveRun(pace()), 1), scrub: SCRUB },
      })
      // down first: the tote rests first, and from 1280 its handles stand 6 px under the top of the screen
      .to(stage, { '--sway-r': '0.9deg', '--sway-y': '6px' })
      .to(stage, { '--sway-r': '-0.9deg', '--sway-y': '-6px' })
      .to(stage, { '--sway-r': '0.9deg', '--sway-y': '6px' });
  }
  // The quote arrives word by word. Split on spaces in the markup; it is still one sentence to a screen reader.
  const quote = document.querySelector('#craft blockquote');
  if (!reduced && quote && belowFold(quote))
    gsap.fromTo(
      '#craft [data-word]',
      { opacity: 0.22 },
      { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: quote, start: 'top 96%', end: 'top 56%', scrub: true } },
    );
  return () => {
    ScrollTrigger.removeEventListener('refreshInit', size);
    run.style.removeProperty('--weave-run');
    // a reverted tween never fires onUpdate
    tiles.forEach((li) => delete li.dataset.active);
    credit?.removeAttribute('data-on');
  };
}

/** S3. The bud rises with the section, each petal opens as its card arrives, and the bloom holds to the section's end. */
function mountBloom(reduced: boolean): () => void {
  const deck = document.querySelector<HTMLElement>('#pillars [data-deck]')!;
  const cards = [...deck.children] as HTMLElement[];
  const v = { rise: 0, c0: 0, c1: 0, c2: 0, end: 0 };
  const push = () =>
    useMotionStore.setState({
      // `end` covers bloom then finale, split by their track weights (0.75 : 1.5)
      lotus: { rise: v.rise, p1: v.c0, p2: v.c1, p3: v.c2, bloom: Math.min(1, v.end * 3), finale: Math.max(0, v.end * 1.5 - 0.5) },
    });
  const scrub = (vars: gsap.TweenVars, scrollTrigger: ScrollTrigger.Vars) =>
    gsap.to(v, { ...vars, ease: 'none', scrollTrigger: { scrub: SCRUB, ...scrollTrigger }, onUpdate: push });
  scrub({ rise: 1 }, { id: 'lotus', trigger: '#pillars', start: 'top 80%', end: 'top 25%' });
  cards.forEach((card, i) => {
    scrub({ [`c${i}`]: 1 }, { trigger: card, start: 'top 90%', end: 'top 50%' });
    ScrollTrigger.create({
      trigger: card,
      start: 'top 70%',
      endTrigger: cards[i + 1] ?? '#pillars',
      end: cards[i + 1] ? 'top 70%' : 'bottom 40%',
      onToggle: (s) => (s.isActive ? card.setAttribute('data-active', 'true') : card.removeAttribute('data-active')),
    });
  });
  scrub({ end: 1 }, { trigger: cards[cards.length - 1], start: 'top 50%', endTrigger: '#pillars', end: 'bottom bottom' });

  // The deck stacks only where every card, at its stacked offset, still fits on screen. A stuck card is
  // pushed off by the deck's foot once it no longer fits above it: the margins make every card run out of
  // room at the same moment, so the stack leaves as one and no card slides over the title of the one before.
  // All of it is settled before ScrollTrigger measures, and the triggers are measured with the deck
  // unstacked: a stuck card reports where it is held, not where it lives.
  let fits = false;
  const unstack = () => deck.setAttribute('data-deck', '');
  const plan = () => {
    cards.forEach((c) => (c.style.marginBottom = ''));
    deck.setAttribute('data-deck', 'stack');
    const foot = cards.map((c) => parseFloat(getComputedStyle(c).top) + c.offsetHeight);
    const low = Math.max(...foot);
    fits = low <= window.innerHeight;
    if (fits) cards.forEach((c, i) => (c.style.marginBottom = `${low - foot[i]}px`));
    unstack();
  };
  const stack = () => {
    if (fits) deck.setAttribute('data-deck', 'stack');
  };
  if (!reduced) {
    ScrollTrigger.addEventListener('refreshInit', plan);
    ScrollTrigger.addEventListener('refresh', stack);
  }
  return () => {
    ScrollTrigger.removeEventListener('refreshInit', plan);
    ScrollTrigger.removeEventListener('refresh', stack);
    unstack();
    cards.forEach((c) => (c.style.marginBottom = ''));
    cards.forEach((card) => card.removeAttribute('data-active'));
  };
}

/**
 * The page thread, in two runs (docs/08 H1). The first carries the hero's main root from the foot of the Sow
 * section straight into the weave film's yarn: the yarn comes in from a point (the .weave-stage mask,
 * globals.css, placed by --seam) and the thread ends in that point, so the two read as one line. It is
 * always drawn. The second starts under the weave and wanders down the right gutter in gentle S-curves. At
 * each seam (a section marked data-thread-side) it leans further in, deepest in the gap between the last
 * copy above and the first copy below; it stays in the gutter, so it never crosses text. Film stages and
 * still-lifes sit above it. Below 1024 it keeps to the left gutter, without leans. Scroll draws it to a tip
 * at THREAD_TIP of the screen.
 */
function mountThread(reduced: boolean): () => void {
  const svg = document.querySelector<SVGSVGElement>('svg[data-thread]');
  const path = svg?.querySelector<SVGPathElement>('[data-thread-run]');
  const pathIn = svg?.querySelector<SVGPathElement>('[data-thread-in]');
  const main = svg?.parentElement;
  const hero = document.querySelector<HTMLElement>('#hero');
  if (!svg || !path || !pathIn || !main || !hero) return () => {};
  // The weave: its section, the stage's sticky box and the canvas the yarn hangs in.
  const craft = document.querySelector<HTMLElement>('#craft');
  const seam = craft?.querySelector<HTMLElement>('[data-seam]');
  const yarn = seam?.querySelector<HTMLElement>('[data-film]');
  const SEAM_DROP = 0.08; // from 1024: how far under the section's top the yarn's point sits, in screens
  // the point: the canvas in its box, the point in the canvas, and whether the box scrolls free (it cannot stick)
  let point: { off: number; local: number; free: boolean } | null = null;
  let pointAt = NaN;
  const COPY = ':is(h2, h3, p, li, blockquote, figcaption, dd, a):not([aria-hidden="true"] *)';
  const CLEAR = 16; // px kept between the thread and the nearest line of copy
  // Length along the path at each height, worked out here rather than asked of the SVG: sampling
  // getPointAtLength down the whole page cost a 100 ms task per build. The path only ever runs down.
  let marks: { y: number; l: number }[] = [];
  let total = 0;

  const build = () => {
    const gutter = parseFloat(getComputedStyle(svg).scrollMarginLeft);
    const page = main.getBoundingClientRect();
    const wrap = main.querySelector('.px-gutter')!.getBoundingClientRect();
    const x = { left: wrap.left - page.left + gutter / 2, right: wrap.right - page.left - gutter / 2 };
    const wide = matchMedia('(min-width: 64rem)').matches;
    // The highest or lowest line of copy in a section, in page coordinates.
    const edge = (section: HTMLElement, side: 'top' | 'bottom') => {
      const ys = [...section.querySelectorAll(COPY)]
        .map((el) => el.getBoundingClientRect())
        .filter((r) => r.height > 0)
        .map((r) => r[side]);
      return (ys.length ? Math[side === 'top' ? 'min' : 'max'](...ys) : section.getBoundingClientRect()[side]) - page.top;
    };

    // The seam. The canvas keeps its place in its box whether the box is stuck or not, so the point is worked
    // out there: SEAM_DROP under the section's top, and never above the canvas's own top (phones tuck the
    // canvas under the nav pill). The thread runs from the hero's foot to a little past it, under the yarn.
    point = null;
    pointAt = NaN;
    pathIn.removeAttribute('d');
    if (craft && seam && yarn) {
      const canvas = yarn.getBoundingClientRect();
      const off = canvas.top - seam.getBoundingClientRect().top;
      const free = getComputedStyle(seam).position !== 'sticky'; // reduced motion, or a screen under 600 px tall
      point = { off, local: Math.max(0, (wide ? window.innerHeight * SEAM_DROP : 0) - off) + 12, free };
      const top = craft.getBoundingClientRect().top - page.top;
      const x = canvas.left - page.left + YARN_X * canvas.width;
      pathIn.setAttribute('d', `M${x} ${hero.getBoundingClientRect().bottom - page.top}V${top + off + point.local + 28}`);
    }

    // Waypoints, top to bottom. x is then a smooth function of y through them. The thread keeps to one
    // gutter (a full crossing in a gap a few hundred px tall reads as a frame, not a thread) and sways gently.
    // It comes back out under the weave: at the top of the first threaded section after it.
    const gx = wide ? x.right : x.left;
    const threaded = all('main [data-thread-side]');
    const sections = threaded.slice(threaded.findIndex((s) => s === craft) + 1);
    if (!sections.length) {
      path.removeAttribute('d');
      marks = [];
      return draw();
    }
    const pts: [number, number][] = [[gx, sections[0].getBoundingClientRect().top - page.top]];
    const amp = Math.min(14, gutter / 4); // the sway stays well inside the gutter
    const wave = window.innerHeight * 0.45;
    let sway = 1;
    const last = () => pts[pts.length - 1][1];
    const run = (to: number) => {
      const from = last();
      const n = Math.round((to - from) / wave);
      for (let i = 1; i < n; i++) pts.push([gx + amp * (sway = -sway), from + ((to - from) * i) / n]);
      if (to > from) pts.push([gx, to]);
    };
    let above = sections[0];
    sections.slice(1).forEach((section) => {
      const first = edge(section, 'top') - CLEAR;
      if (wide) {
        // A seam: the thread leans further in, deepest in the gap between one section's copy and the next.
        // It takes the same half wave as any other sway to get there and back, and stays in the gutter:
        // a swing made inside the gap alone is too tight a turn, and reads as a kink.
        const from = Math.max(edge(above, 'bottom') + CLEAR, last() + 1);
        const gap = first - from;
        if (gap > 96) {
          const mid = from + gap / 2;
          run(mid - wave / 2);
          pts.push([gx - Math.min(gap * 0.25, gutter / 2 - 8), mid]);
        }
      }
      above = section;
    });
    run(page.height);

    // Monotone cubic through the waypoints: a slope is the harmonic mean of its two neighbours' or zero at a
    // turn, which cannot overshoot, so the line never bulges out of its gutter.
    const slope = pts.map(([wx, wy], k) => {
      if (k === 0 || k === pts.length - 1) return 0;
      const up = (wx - pts[k - 1][0]) / (wy - pts[k - 1][1]);
      const down = (pts[k + 1][0] - wx) / (pts[k + 1][1] - wy);
      return up * down > 0 ? (2 * up * down) / (up + down) : 0;
    });
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    total = 0;
    marks = [{ y: pts[0][1], l: 0 }];
    for (let k = 1; k < pts.length; k++) {
      const [x0, y0] = pts[k - 1];
      const [x1, y1] = pts[k];
      const h = y1 - y0;
      const c0 = x0 + (slope[k - 1] * h) / 3;
      const c1 = x1 - (slope[k] * h) / 3;
      d += `C${c0} ${y0 + h / 3} ${c1} ${y1 - h / 3} ${x1} ${y1}`;
      let lx = x0;
      for (let i = 1; i <= 12; i++) {
        const t = i / 12;
        const u = 1 - t;
        const bx = u * u * u * x0 + 3 * u * u * t * c0 + 3 * u * t * t * c1 + t * t * t * x1;
        total += Math.hypot(bx - lx, h / 12);
        lx = bx;
        marks.push({ y: y0 + h * t, l: total });
      }
    }
    path.setAttribute('d', d);
    svg.querySelector('linearGradient')!.setAttribute('y2', String(page.height));
    // The chords come up a hair short of the true length: the long gap keeps that last sliver from showing as a dot.
    path.style.strokeDasharray = `${total} ${total * 2}`;
    draw();
  };
  const draw = () => {
    if (point && craft && seam && yarn) {
      // The yarn's point belongs to the page, the canvas sticks: tell the mask where the point is in the
      // canvas now (and the box, whose phone backdrop starts there). Past the top it stops being written.
      const y = craft.getBoundingClientRect().top + point.off + point.local;
      const open = -0.4 * yarn.offsetHeight; // the mask's rise is done 40 % under the point: from here the canvas is whole
      let at = y - yarn.getBoundingClientRect().top;
      // A box that cannot stick carries the canvas up the page with it, so the point would never leave and its
      // mask would lie across the products. There it slides out as the box climbs from the foot of the screen
      // to 60 % of it, which is where the products begin (mountWeave).
      if (point.free)
        at += (open - at) * gsap.utils.clamp(0, 1, (window.innerHeight - seam.getBoundingClientRect().top) / (0.4 * window.innerHeight));
      const local = Math.round(Math.max(open, at));
      if (local !== pointAt) {
        pointAt = local;
        yarn.style.setProperty('--seam', `${local}px`);
        seam.style.setProperty('--seam-box', `${Math.max(0, local + point.off)}px`);
      }
    }
    if (reduced) return void (path.style.strokeDashoffset = '0'); // drawn in full: nothing animates
    const tip = window.innerHeight * THREAD_TIP - main.getBoundingClientRect().top;
    const i = marks.findIndex((m) => m.y >= tip);
    const a = marks[i - 1];
    const b = marks[i];
    const drawn = i < 0 ? total : !a ? 0 : a.l + ((tip - a.y) / (b.y - a.y || 1)) * (b.l - a.l);
    path.style.strokeDashoffset = String(total - drawn);
  };

  // onRefresh covers resize and late fonts; the film event arrives when the seed manifest gives the real exit point.
  const trigger = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: draw, onRefresh: build });
  window.addEventListener('gieo:film', build);
  build();
  return () => {
    trigger.kill();
    window.removeEventListener('gieo:film', build);
    path.removeAttribute('d');
    pathIn.removeAttribute('d');
    yarn?.style.removeProperty('--seam');
    seam?.style.removeProperty('--seam-box');
  };
}

// Capture only (QA hook): one film at timeline t.
function pose(scene: SceneName, t: number) {
  const v = beatsAt(scene, t);
  useMotionStore.setState(
    scene === 'seed' ? { seed: v[0] } : { [scene]: Object.fromEntries(TRACKS[scene].beats.map((b, i) => [b, v[i]])) },
  );
}

export function mountPage(): () => void {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  if (!reduced && !lenis) {
    const l = new Lenis(LENIS_OPTIONS);
    lenis = l;
    l.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => l.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  // A soft navigation must not resume an old glide, and hash anchors stay put.
  lenis?.scrollTo(window.scrollY, { immediate: true, force: true });
  // CSS pins the Sow film only under this flag: no JS or reduced motion means no pin, and the copy in flow.
  if (!reduced) root.dataset.motion = 'on';

  const controller = new AbortController();
  const undo: (() => void)[] = [];
  const ctx = gsap.context(() => {});
  const keep = (fn: () => () => void): Step => () => void undo.push(fn());
  const steps: Step[] = [...revealSteps()];
  if (!reduced) {
    steps.push(...drawSteps(), ...parallaxSteps(), () => mountTilt(controller.signal), keep(mountEnters));
  }
  if (document.querySelector('#hero [data-film]')) steps.push(keep(() => mountSow(reduced)));
  if (document.querySelector('#craft [data-film]')) steps.push(keep(() => mountWeave(reduced)));
  if (document.querySelector('#pillars [data-deck]')) steps.push(keep(() => mountBloom(reduced)));
  steps.push(keep(() => mountThread(reduced)), keep(() => mountClips(reduced)));

  let live = true;
  // A font that lands while the steps run moves the triggers already made; one refresh at the end fixes them.
  let fontsMoved = document.fonts.status !== 'loaded';
  const onFont = () => (fontsMoved = true);
  document.fonts.addEventListener('loadingdone', onFont);
  void (async () => {
    // First hop: the runtime's chunk has just been evaluated in this task.
    await yieldToMain();
    for (let i = 0; i < steps.length && live; ) {
      const t0 = performance.now();
      ctx.add(() => {
        do steps[i++]();
        while (i < steps.length && performance.now() - t0 < SLICE_MS);
      });
      await yieldToMain();
    }
    document.fonts.removeEventListener('loadingdone', onFont);
    if (!live) return;
    // Every step has run: QA scripts wait for this (not data-motion, which is set before the first step).
    root.dataset.motionReady = '';
    // QA hook; production readers never pass ?tier. pose() sets one film to timeline t.
    if (location.search.includes('tier='))
      Object.assign(window, { __gieoMotion: { store: useMotionStore, ScrollTrigger, timeOf, TRACKS, pose } });
    // Late fonts move every trigger; a page torn down before they settle must not be refreshed.
    if (fontsMoved) void document.fonts.ready.then(() => live && ScrollTrigger.refresh());
  })();
  return () => {
    live = false;
    document.fonts.removeEventListener('loadingdone', onFont);
    delete root.dataset.motionReady;
    controller.abort();
    undo.forEach((fn) => fn());
    ctx.revert();
    delete root.dataset.motion;
    // Reverted tweens don't fire onUpdate, so a return visit would start from the old pose.
    const zero = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
    useMotionStore.setState({ seed: 0, weave: zero(TRACKS.weave.beats), lotus: zero(TRACKS.lotus.beats) });
  };
}
