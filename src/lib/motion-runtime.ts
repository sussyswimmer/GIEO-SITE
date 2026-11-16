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
import { beatsAt, timeOf, TRACKS } from './fallback-timeline';
import { coverPoint, type FilmManifest, type FilmSet } from './film';
import { useMotionStore, type WeaveBeat } from './motion-store';

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
  const band = document.querySelector<HTMLElement>('[data-band]');
  if (band)
    gsap.fromTo(
      band,
      { xPercent: -4 },
      { xPercent: -38, ease: 'none', scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: SCRUB } },
    );
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
    tl.to('[data-hero-fade]', { opacity: 0, duration: HERO_FADE }, whole).to(
      word,
      { scale: 0.42, opacity: 0, y: () => Math.min(0, HERO_GHOST_TOP - word.offsetTop), transformOrigin: '0 0', duration: gone - whole },
      whole,
    );
    all('[data-hero-beat]').forEach((beat, i) => {
      const [shown, until] = HERO_BEATS[i];
      tl.fromTo(beat, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: HERO_FADE }, shown - HERO_FADE);
      if (until < 1) tl.to(beat, { opacity: 0, y: -12, duration: HERO_FADE }, until);
    });
    tl.to({}, { duration: 0.001 }, 0.999); // so the timeline spans the whole run
  });
  return () => {
    mm.revert();
    window.removeEventListener('gieo:film', safe);
    ScrollTrigger.removeEventListener('refresh', safe);
    hero.style.removeProperty('--safe-x');
    hero.style.removeProperty('--safe-y');
  };
}

/**
 * S1. The film runs thread → cloth against the section's scroll, then tote → mug → coaster against the
 * product list, so each name is underlined while its product is on screen.
 */
function mountWeave(reduced: boolean): () => void {
  const { beats, weights } = TRACKS.weave;
  const made = weights.slice(0, 4).reduce((a, b) => a + b, 0); // thread, warps, weave, drape
  const total = weights.reduce((a, b) => a + b, 0);
  const tiles = all('#craft ul[role="list"] > li');
  const credit = document.querySelector<HTMLElement>('#craft [data-credit]');
  const v = { cloth: 0, products: 0 };
  const push = () => {
    const now = beatsAt('weave', (made * v.cloth + (total - made) * v.products) / total);
    useMotionStore.setState({ weave: Object.fromEntries(beats.map((b, i) => [b, now[i]])) as Record<WeaveBeat, number> });
    credit?.toggleAttribute('data-on', now[3] > 0); // from the drape: the cloth is becoming a product
    tiles.forEach((li, i) => {
      const x = now[4 + i];
      // A beat opens on the last product leaving and this one arriving: its name waits until it is in. The
      // coaster stays on: the film ends on it.
      const on = x >= 0.4 && (x < 1 || i === tiles.length - 1);
      if ((li.dataset.active === 'true') === on) return; // written only on change
      if (on) li.dataset.active = 'true';
      else delete li.dataset.active;
    });
  };
  const list = tiles[0]?.parentElement;
  gsap.to(v, {
    cloth: 1,
    ease: 'none',
    scrollTrigger: { id: 'weave', trigger: '#craft', start: 'top 80%', endTrigger: list, end: 'top 95%', scrub: SCRUB },
    onUpdate: push,
  });
  gsap.to(v, {
    products: 1,
    ease: 'none',
    // ends as the section's foot meets the foot of the screen: the stage is stuck until then, so no product is shown leaving
    scrollTrigger: { trigger: list, start: 'top 95%', endTrigger: '#craft', end: 'bottom bottom', scrub: SCRUB },
    onUpdate: push,
  });
  // The quote arrives word by word. Split on spaces in the markup; it is still one sentence to a screen reader.
  const quote = document.querySelector('#craft blockquote');
  if (!reduced && quote && belowFold(quote))
    gsap.fromTo(
      '#craft [data-word]',
      { opacity: 0.22 },
      { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: quote, start: 'top 96%', end: 'top 56%', scrub: true } },
    );
  return () => {
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
 * The page thread. Starts under the seed film's stem (its threadExit x, at the foot of the Sow section) and
 * wanders down the right gutter in gentle S-curves. At each seam (a section marked data-thread-side) it
 * leans further in, deepest in the gap between the last copy above and the first copy below; it stays in
 * the gutter, so it never crosses text. Film stages and still-lifes sit above it. Below 1024 it keeps to
 * the left gutter, without leans. Scroll draws it to a tip at THREAD_TIP of the screen.
 */
function mountThread(reduced: boolean): () => void {
  const svg = document.querySelector<SVGSVGElement>('svg[data-thread]');
  const path = svg?.querySelector('path');
  const main = svg?.parentElement;
  const hero = document.querySelector<HTMLElement>('#hero');
  if (!svg || !path || !main || !hero) return () => {};
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

    // Where the film's stem leaves its frame, as the stage shows it (cover fit); the stage's centre until the film is in.
    const stage = hero.querySelector<HTMLElement>('[data-film]');
    const { size, focus, threadExit } = stage?.dataset ?? {};
    let px = (stage?.clientWidth ?? page.width) / 2;
    if (stage && size && focus && threadExit) {
      const [w, h] = size.split(',').map(Number);
      const set = { id: '', w, h, focus: focus.split(',').map(Number) as [number, number] };
      px = coverPoint(set, stage.clientWidth, stage.clientHeight, threadExit.split(',').map(Number) as [number, number])[0];
    }
    px = Math.min(page.width - 1, Math.max(1, px)); // exactly under the stem, even where a narrow screen crops it to the edge

    // Waypoints, top to bottom. x is then a smooth function of y through them. The thread keeps to one
    // gutter (a full crossing in a gap a few hundred px tall reads as a frame, not a thread) and sways gently.
    const gx = wide ? x.right : x.left;
    const pts: [number, number][] = [[px, hero.getBoundingClientRect().bottom - page.top]];
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
    let above: HTMLElement | null = null;
    all('main [data-thread-side]').forEach((section) => {
      const first = edge(section, 'top') - CLEAR;
      if (!above) pts.push([gx, Math.max(first, last() + 48)]); // from the stem's exit over to the gutter
      else if (wide) {
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
