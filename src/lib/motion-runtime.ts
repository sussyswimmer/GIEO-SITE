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
import { beatsAt, timeOf, TRACKS, WEAVE_PACE, WEAVE_PRODUCTS, weaveRun } from './fallback-timeline';
import { coverPoint, type FilmManifest, type FilmSet } from './film';
import { useMotionStore, type WeaveBeat } from './motion-store';
import { mountClips } from './scrub-clip';
import { FILM_START } from './roots';
import { ACT1_SVH, remap } from './vine';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

let lenis: Lenis | null = null;

const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// The production CSS minifier rewrites 700ms as .7s, so the unit has to be read.
const seconds = (name: string) => {
  const value = token(name);
  return parseFloat(value) / (value.endsWith('ms') ? 1000 : 1);
};
const belowFold = (el: Element) => el.getBoundingClientRect().top > window.innerHeight;
const all = <T extends Element = HTMLElement>(selector: string) => [...document.querySelectorAll<T>(selector)];

function mountReveals() {
  const y = parseFloat(token('--reveal-distance'));
  const duration = seconds('--dur-reveal');
  const stagger = seconds('--stagger');
  all('main h2').forEach((el) => {
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

function mountDraws() {
  all<SVGPathElement>('svg[data-draw="view"] path').forEach((path) => {
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

function mountParallax() {
  all('[data-parallax]').forEach((inner) => {
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
  all('[data-drift]').forEach((el) => {
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
  all('[data-band]').forEach((band) => {
    const [from, to] = band.dataset.band === 'reverse' ? [-38, -4] : [-4, -38];
    gsap.fromTo(
      band,
      { xPercent: from },
      { xPercent: to, ease: 'none', scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: SCRUB } },
    );
  });
  // A line of type that slides as its block crosses the screen: data-slide is the travel each way, in % of
  // its own width (negative: the other way). Two lines with opposite signs pass each other.
  all('[data-slide]').forEach((el) => {
    const v = Number(el.dataset.slide);
    gsap.fromTo(
      el,
      { xPercent: v },
      { xPercent: -v, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: SCRUB } },
    );
  });
  // A loose petal or leaf: it floats up past its place by data-float px each way, turning a little as it goes.
  all('[data-float]').forEach((el, i) => {
    const v = Number(el.dataset.float);
    gsap.fromTo(
      el,
      { y: v, rotation: i % 2 ? -40 : 30 },
      { y: -v, rotation: i % 2 ? 50 : -45, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: SCRUB } },
    );
  });
  // A ring that turns with the scroll: data-spin is the turn each way, in degrees.
  all<SVGElement>('[data-spin]').forEach((el) => {
    const v = Number(el.dataset.spin);
    gsap.fromTo(
      el,
      { rotation: -v, svgOrigin: '50 50' },
      { rotation: v, svgOrigin: '50 50', ease: 'none', scrollTrigger: { trigger: el.closest('svg'), start: 'top bottom', end: 'bottom top', scrub: SCRUB } },
    );
  });
  // A full-bleed picture settles as it crosses the screen (docs/08 H3: 1.08 → 1). Its wrapper clips it.
  all('[data-zoom]').forEach((el) => {
    gsap.fromTo(
      el,
      { scale: 1.08 },
      { scale: 1, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: SCRUB } },
    );
  });
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
// The film never rests (Maxwell, 2026-11-17: a held frame reads as a locked scroll): it moves from the
// first scroll to the sink. HERO_FILM_VINE: after Act 1 the seed is already falling, so no opening hold.
const HERO_FILM: [until: number, frame: number][] = [[0.06, 0], [0.32, 95], [0.92, 149], [1, 149]];
const HERO_FILM_VINE: [until: number, frame: number][] = [[0.3, 95], [0.92, 149], [1, 149]];
const HERO_WORD_VINE = [0, 0.16]; // the word and its plant shrink away as the seed drops
const HERO_WORD = [0.12, 0.24]; // the headline is whole until the first, gone by the second
// The last beat is the sub line and the two ways in (Sow.tsx): the first screen shows only the word.
const HERO_BEATS: [shown: number, until: number][] = [[0.29, 0.45], [0.55, 0.67], [0.77, 0.86], [0.9, 1]];
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
  const hero = document.querySelector<HTMLElement>('#hero')!;
  const html = document.documentElement;
  // Act 1 (the vine, VineScene): Full tier only. It lengthens the run (globals.css) and goes first; every
  // position below then lands in the rest of the run, so the film still starts the moment the seed lands.
  const vine = !reduced && useMotionStore.getState().tier === 'full' && !!hero.querySelector('[data-vine]');
  if (vine) html.dataset.vine = 'on';
  const run0 = hero.offsetHeight - window.innerHeight;
  const share = vine && run0 > 0 ? Math.min(0.8, ((ACT1_SVH / 100) * window.innerHeight) / run0) : 0;
  const at = (x: number) => remap(x, share);
  const span = (d: number) => d * (1 - share);

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
  if (share) film.to(proxy, { p: 0, duration: share }); // Act 1: the film waits on frame 0 under the vine's canvas
  const steps = vine ? HERO_FILM_VINE : HERO_FILM;
  steps.forEach(([until, frame], i) => film.to(proxy, { p: frame / last, duration: span(until - (steps[i - 1]?.[0] ?? 0)) }));
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
    gsap.set(word, { animation: 'none' });
    // The word shrinks away under the nav and is gone before the first beat arrives in the same corner.
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
    });
    const [whole, gone] = vine ? HERO_WORD_VINE : HERO_WORD;
    tl.to(
      word,
      { scale: 0.42, opacity: 0, y: () => Math.min(0, HERO_GHOST_TOP - word.offsetTop), transformOrigin: '0 0', duration: span(gone - whole) },
      at(whole),
    );
    // autoAlpha: a beat's buttons leave the tab order while it is hidden
    all('[data-hero-beat]').forEach((beat, i) => {
      const [shown, until] = HERO_BEATS[i] ?? HERO_BEATS[HERO_BEATS.length - 1];
      tl.fromTo(beat, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: span(HERO_FADE) }, at(shown - HERO_FADE));
      if (until < 1) tl.to(beat, { autoAlpha: 0, y: -12, duration: span(HERO_FADE) }, at(until));
    });
    // Going under (docs/08 H1): the soil darkens into plum, then the ground lifts while the roots grow down
    // to the foot of the screen. The lift eases in over just the stretch that ends it at the page's own
    // speed (a quadratic ends at 2 × distance / time), so the pin lets go without a change of pace.
    const run = hero.offsetHeight - window.innerHeight;
    const lift = Math.min(0.2, (2 * HERO_LIFT * stage.clientHeight) / Math.max(1, run));
    tl.fromTo('[data-hero-sink]', { opacity: 0 }, { opacity: 1, duration: span(HERO_SINK[1] - HERO_SINK[0]) }, at(HERO_SINK[0]))
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
    if (vine) delete html.dataset.vine;
  };
}

/**
 * S1. The film runs thread → cloth against the copy's scroll, then through the products (WEAVE_PRODUCTS: the
 * Nối Bag, then the Nếp Keychain) against the product run (docs/08 H2). Scroll maps to the film piecewise,
 * the film itself is not re-timed: each product is made over `change` svh and then rests on its last frame
 * for `hold` svh (WEAVE_PACE) while its name is lit and the stage sways a little, so a rest is never dead.
 * Where nothing pins (reduced motion, a short screen) the products share the list's passage through the
 * screen instead.
 */
function mountWeave(reduced: boolean): () => void {
  const { beats, weights } = TRACKS.weave;
  const made = weights.slice(0, 4).reduce((a, b) => a + b, 0); // thread, warps, weave, drape
  const n = WEAVE_PRODUCTS.length;
  const total = weights.reduce((a, b) => a + b, 0);
  const craft = document.querySelector<HTMLElement>('#craft')!;
  const run = craft.querySelector<HTMLElement>('[data-weave-run]') ?? craft;
  const names = run.querySelector<HTMLElement>('[data-weave-names]');
  const tiles = all('#craft ul[role="list"] > li');
  const credit = craft.querySelector<HTMLElement>('[data-credit]');
  const wide = matchMedia('(min-width: 64rem)');
  const pace = () => (wide.matches ? WEAVE_PACE.wide : WEAVE_PACE.phone);
  // The film opens on a close-up of one hairy green yarn (frames 0 to 50: 'thread', 'warps'). Maxwell found
  // that seam "horrible", twice: the film now starts where the warps are laid, and the cloth weaves from there.
  // With the live seam (RootsScene, Full tier: <html data-roots="on">) the roots and the weaving are drawn
  // live, and the film waits on its finished cloth (frame 89) until that run is over (FILM_START).
  const roots = document.documentElement.dataset.roots === 'on';
  const start = (weights[0] + weights[1] + (roots ? weights[2] : 0)) / made;
  // the cloth's scrub, and one scrub per product: p0 makes the first (the cloth becomes the bag), p1 the next
  const v: Record<string, number> = { cloth: start, ...Object.fromEntries(WEAVE_PRODUCTS.map((_, i) => [`p${i}`, 0])) };
  // One product gives way to the next by gliding (Maxwell, 2026-11-19: "super laggy"). A change scrubbed
  // frame by frame over a quarter of a screen reads as jumps. So the stage itself carries the change, at the
  // screen's own rate: the product at rest glides out and fades, the film skips the frames that move from one
  // product to the next while nothing shows (`WIPE`, a share of the product's 20-frame beat), and the next
  // glides in. The first product is not glided: the cloth becomes it in place.
  const glideStage = reduced ? null : craft.querySelector<HTMLElement>('[data-film]');
  // lipstick: the camera's travel from the bag to the keychain ends on frame 140 (CAM in blender/film/weave.py),
  // 11 of the beat's 20 frames; the keychain settles under it from there to 149
  const WIPE: Partial<Record<WeaveBeat, number>> = { lipstick: 11 / 20 };
  let glided = '';
  const push = () => {
    const ps = WEAVE_PRODUCTS.map((_, i) => v[`p${i}`]);
    const pose = (p: number, i: number) => {
      if (!glideStage || i === 0) return p;
      const wipe = WIPE[WEAVE_PRODUCTS[i]] ?? 0;
      return p < 0.5 ? 0 : wipe + (p - 0.5) * 2 * (1 - wipe);
    };
    const now = [...beatsAt('weave', (made * v.cloth) / total).slice(0, 4), ...ps.map(pose)];
    useMotionStore.setState({ weave: Object.fromEntries(beats.map((b, i) => [b, now[i]])) as Record<WeaveBeat, number> });
    if (glideStage) {
      // The change in flight, if any (the latest one): out to the left over its first half, in from the right
      // over its second.
      let p = 0;
      for (let i = n - 1; i > 0 && !p; i--) if (ps[i] > 0 && ps[i] < 1) p = ps[i];
      const k = p < 0.5 ? p * 2 : (1 - p) * 2; // 0 at rest, 1 where the film changes product
      const x = (p < 0.5 ? -1 : 1) * 16 * k * k;
      const next = `${x.toFixed(2)}%,${(1 - k * k * (3 - 2 * k)).toFixed(3)}`;
      if (next !== glided) {
        glided = next;
        glideStage.style.setProperty('--glide-x', `${x.toFixed(2)}%`);
        glideStage.style.setProperty('--glide-o', next.split(',')[1]);
      }
    }
    credit?.toggleAttribute('data-on', now[3] > 0); // from the drape: the cloth is becoming a product
    tiles.forEach((li, i) => {
      // A name is lit from the moment its product is more in than out, until the next one is. The names
      // follow the scroll (ps), not the film's frames.
      const on = (ps[i] ?? 0) >= 0.5 && (ps[i + 1] ?? 0) < 0.5;
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
  // The scroll position `svh` after the names stick; with nothing pinned, share k of the list's passage.
  const point = (svh: number, k: number) => {
    const unit = (parseFloat(getComputedStyle(run, '::after').height) || 0) / weaveRun(pace()); // px per svh, 0 unpinned
    if (unit && names) return y(run, 'top') - (parseFloat(getComputedStyle(names).top) || 0) + svh * unit;
    const from = y(run, 'top') - 0.95 * window.innerHeight;
    return from + k * Math.max(1, y(craft, 'bottom') - window.innerHeight - from);
  };
  // Product i is made between mark(i, 0) and mark(i, 1), and rests from there to mark(i + 1, 0).
  const mark = (i: number, done: 0 | 1) => () => {
    const { hold, change } = pace();
    return point(i * (hold + change) - (done ? 0 : change), (i + done) / n);
  };
  const scrub = (vars: gsap.TweenVars, scrollTrigger: ScrollTrigger.Vars) =>
    gsap.to(v, { ...vars, ease: 'none', scrollTrigger: { scrub: SCRUB, ...scrollTrigger }, onUpdate: push });
  push(); // the stage shows the laid warps before any scroll reaches it, never frame 0
  scrub({ cloth: 1 }, { id: 'weave', trigger: craft, start: roots ? FILM_START : 'top 80%', end: mark(0, 0) });
  WEAVE_PRODUCTS.forEach((_, i) => scrub({ [`p${i}`]: 1 }, { trigger: run, start: mark(i, 0), end: mark(i, 1) }));

  const stage = craft.querySelector<HTMLElement>('[data-film]');
  if (!reduced && stage) {
    // While a product rests the stage still answers the scroll: a slow sway, 6 px and under a degree each way,
    // one swing per product, down first. Custom properties, not rotation/y: GSAP would fold the stage's CSS
    // `translate` into an inline transform.
    const sway = gsap.timeline({
      defaults: { ease: 'sine.inOut' },
      scrollTrigger: { trigger: run, start: mark(0, 1), end: () => point(weaveRun(pace()), 1), scrub: SCRUB },
    });
    WEAVE_PRODUCTS.forEach((_, i) => sway.to(stage, i % 2 ? { '--sway-r': '-0.9deg', '--sway-y': '-6px' } : { '--sway-r': '0.9deg', '--sway-y': '6px' }));
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
    glideStage?.style.removeProperty('--glide-x');
    glideStage?.style.removeProperty('--glide-o');
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
  const light = svg?.querySelector<SVGPathElement>('[data-thread-light]');
  const budsBox = svg?.querySelector<SVGGElement>('[data-thread-buds]');
  const tipBox = svg?.querySelector<SVGGElement>('[data-thread-tip]');
  const pathIn = svg?.querySelector<SVGPathElement>('[data-thread-in]');
  const main = svg?.parentElement;
  const hero = document.querySelector<HTMLElement>('#hero');
  if (!svg || !path || !pathIn || !main || !hero) return () => {};
  // The weave: its section, the stage's sticky box and the canvas the yarn hangs in.
  const craft = document.querySelector<HTMLElement>('#craft');
  const seam = craft?.querySelector<HTMLElement>('[data-seam]');
  const yarn = seam?.querySelector<HTMLElement>('[data-film]');
  const SEAM_DROP = 0.08; // from 1024: how far under the section's top the yarn's point sits, in screens
  let point: { off: number; local: number } | null = null; // the point: the canvas in its box, and the point in the canvas
  let pointAt = NaN;
  const COPY = ':is(h2, h3, p, li, blockquote, figcaption, dd, a):not([aria-hidden="true"] *)';
  const CLEAR = 16; // px kept between the thread and the nearest line of copy
  // Length along the path at each height, worked out here rather than asked of the SVG: sampling
  // getPointAtLength down the whole page cost a 100 ms task per build. The path only ever runs down.
  let marks: { x: number; y: number; l: number }[] = [];
  let total = 0;
  // The thread is a vine (Maxwell, 2026-11-19): leaves, tendrils and blossoms stand along it, each at a
  // length down the path, and each opens when the growing tip has passed it (`open` of them are open now).
  let buds: { l: number; el: Element }[] = [];
  let open = 0;
  // Where the path is at length l, and which way it is heading there (degrees; 90 is straight down).
  const at = (l: number) => {
    let i = marks.findIndex((m) => m.l >= l);
    if (i < 1) i = i < 0 ? marks.length - 1 : 1;
    const a = marks[i - 1];
    const b = marks[i];
    if (!a || !b) return { x: 0, y: 0, deg: 90 };
    const t = Math.min(1, Math.max(0, (l - a.l) / (b.l - a.l || 1)));
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, deg: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
  };
  const grow = (gutter: number, wide: boolean) => {
    if (!budsBox) return;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const n = (v: number) => v.toFixed(1);
    const S = Math.max(wide ? 13 : 8, Math.min(28, gutter * (wide ? 0.56 : 0.4))); // a leaf's length: it must stay inside the gutter
    const leaf = (len: number, tone: number) =>
      `<path class="pvine-leaf" data-tone="${tone}" d="M0 0C${n(len * 0.28)} ${n(-len * 0.4)} ${n(len * 0.78)} ${n(-len * 0.3)} ${n(len)} 0C${n(len * 0.78)} ${n(len * 0.3)} ${n(len * 0.28)} ${n(len * 0.4)} 0 0Z"/>` +
      `<path class="pvine-rib" d="M${n(len * 0.08)} 0L${n(len * 0.9)} 0"/>`;
    const flower = (r: number, deep: boolean) => {
      const c = r * 1.5; // on a short stalk off the stem
      let out = `<path class="pvine-stalk" d="M0 0L${n(c)} 0"/><g transform="translate(${n(c)} 0) rotate(${n(rnd() * 72)})"${deep ? ' data-deep=""' : ''}>`;
      for (let k = 0; k < 5; k++) out += `<ellipse class="pvine-petal" cx="${n(r * 0.58)}" rx="${n(r * 0.56)}" ry="${n(r * 0.4)}" transform="rotate(${k * 72})"/>`;
      return `${out}<circle class="pvine-throat" r="${n(r * 0.3)}"/><circle class="pvine-eye" r="${n(r * 0.14)}"/></g>`;
    };
    const curl = (len: number) => {
      const k = len / 16;
      const c = (...v: number[]) => v.map((q) => n(q * k)).join(' ');
      return `<path class="pvine-curl" d="M0 0C${c(5, -3, 13, -5, 16, 1)}C${c(18, 6, 12, 10, 9.5, 6)}C${c(8, 3, 11.5, 2, 12, 4.5)}"/>`;
    };
    let html = '';
    const made: number[] = [];
    let side = 1;
    let k = 0;
    for (let l = 24 + rnd() * 30; l < total - 30; l += (wide ? 58 : 46) + rnd() * 54, k++) {
      const p = at(l);
      side = -side;
      const kind = k % 5 === 2 ? 'flower' : k % 7 === 5 ? 'curl' : 'leaf';
      // Leaves and tendrils reach out and a little forward (down the page, the way it grows); a flower stands straight out.
      const turn = kind === 'flower' ? 90 : 38 + rnd() * 34;
      const body =
        kind === 'flower' ? flower(S * (0.42 + rnd() * 0.12), k % 2 === 0) : kind === 'curl' ? curl(S * 0.8) : leaf(S * (0.72 + rnd() * 0.4), k % 3);
      html += `<g transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n(p.deg - side * turn)})"><g class="pvine-bud">${body}</g></g>`;
      made.push(l + 10); // open once the tip is a little past
    }
    budsBox.innerHTML = html;
    buds = [...budsBox.querySelectorAll('.pvine-bud')].map((el, i) => ({ el, l: made[i] }));
    open = 0;
    if (tipBox) tipBox.innerHTML = `<g transform="rotate(-28)">${leaf(S * 0.5, 1)}</g><g transform="rotate(28)">${leaf(S * 0.5, 0)}</g>`;
  };

  const build = () => {
    const gutter = parseFloat(getComputedStyle(svg).scrollMarginLeft);
    const page = main.getBoundingClientRect();
    const wrap = main.querySelector('.px-gutter')!.getBoundingClientRect();
    const wide = matchMedia('(min-width: 64rem)').matches;
    // On a phone the gutter is narrow and the copy starts right after it: the vine keeps to its outer third.
    const x = { left: wrap.left - page.left + gutter * (wide ? 0.5 : 0.3), right: wrap.right - page.left - gutter / 2 };
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
      point = { off, local: Math.max(0, (wide ? window.innerHeight * SEAM_DROP : 0) - off) + 12 };
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
      light?.removeAttribute('d');
      budsBox?.replaceChildren();
      buds = [];
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
    marks = [{ x: pts[0][0], y: pts[0][1], l: 0 }];
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
        marks.push({ x: bx, y: y0 + h * t, l: total });
      }
    }
    // The chords come up a hair short of the true length: the long gap keeps that last sliver from showing as a dot.
    [path, light].forEach((el) => {
      el?.setAttribute('d', d);
      if (el) el.style.strokeDasharray = `${total} ${total * 2}`;
    });
    svg.style.setProperty('--pvine-w', `${wide ? 5 : 3.5}px`);
    grow(gutter, wide);
    draw();
  };
  const draw = () => {
    if (point && craft && seam && yarn) {
      // The yarn's point belongs to the page, the canvas sticks: tell the mask where the point is in the
      // canvas now (and the box, whose phone backdrop starts there). Past the top it stops being written.
      const y = craft.getBoundingClientRect().top + point.off + point.local;
      const local = Math.round(Math.max(-0.4 * yarn.offsetHeight, y - yarn.getBoundingClientRect().top));
      if (local !== pointAt) {
        pointAt = local;
        yarn.style.setProperty('--seam', `${local}px`);
        seam.style.setProperty('--seam-box', `${Math.max(0, local + point.off)}px`);
      }
    }
    let drawn = total; // reduced motion: drawn in full, every bud open, nothing animates
    if (!reduced) {
      const tip = window.innerHeight * THREAD_TIP - main.getBoundingClientRect().top;
      const i = marks.findIndex((m) => m.y >= tip);
      const a = marks[i - 1];
      const b = marks[i];
      drawn = i < 0 ? total : !a ? 0 : a.l + ((tip - a.y) / (b.y - a.y || 1)) * (b.l - a.l);
    }
    const off = String(total - drawn);
    path.style.strokeDashoffset = off;
    if (light) light.style.strokeDashoffset = off;
    // A round cap on nothing is a dot: no stem until there is some.
    path.style.visibility = drawn > 1 ? '' : 'hidden';
    if (light) light.style.visibility = path.style.visibility;
    // Written only on change: one bud at a time as the tip passes it, or closes on the way back up.
    while (open < buds.length && buds[open].l <= drawn) buds[open++].el.setAttribute('data-on', '');
    while (open > 0 && buds[open - 1].l > drawn) buds[--open].el.removeAttribute('data-on');
    if (tipBox) {
      // The growing tip: a pair of young leaves riding the end of the stem.
      const live = !reduced && drawn > 1 && drawn < total - 1;
      const p = live ? at(drawn) : null;
      tipBox.style.visibility = p ? '' : 'hidden';
      if (p) tipBox.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.deg.toFixed(1)})`);
    }
  };

  // onRefresh covers resize and late fonts; the film event arrives when the seed manifest gives the real exit point.
  const trigger = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: draw, onRefresh: build });
  window.addEventListener('gieo:film', build);
  build();
  return () => {
    trigger.kill();
    window.removeEventListener('gieo:film', build);
    path.removeAttribute('d');
    light?.removeAttribute('d');
    budsBox?.replaceChildren();
    tipBox?.replaceChildren();
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
  const ctx = gsap.context(() => {
    mountReveals();
    if (!reduced) {
      mountDraws();
      mountParallax();
      mountTilt(controller.signal);
      undo.push(mountEnters());
    }
    if (document.querySelector('#hero [data-film]')) undo.push(mountSow(reduced));
    if (document.querySelector('#craft [data-film]')) undo.push(mountWeave(reduced));
    if (document.querySelector('#pillars [data-deck]')) undo.push(mountBloom(reduced));
    undo.push(mountThread(reduced));
    undo.push(mountClips(reduced));
  });
  // QA hook; production readers never pass ?tier. pose() sets one film to timeline t.
  if (location.search.includes('tier='))
    Object.assign(window, { __gieoMotion: { store: useMotionStore, ScrollTrigger, timeOf, TRACKS, pose } });
  // Late fonts move every trigger; a page torn down before they settle must not be refreshed.
  let live = true;
  void document.fonts.ready.then(() => live && ScrollTrigger.refresh());
  return () => {
    live = false;
    controller.abort();
    undo.forEach((fn) => fn());
    ctx.revert();
    delete root.dataset.motion;
    // Reverted tweens don't fire onUpdate, so a return visit would start from the old pose.
    const zero = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
    useMotionStore.setState({ seed: 0, weave: zero(TRACKS.weave.beats), lotus: zero(TRACKS.lotus.beats) });
  };
}
