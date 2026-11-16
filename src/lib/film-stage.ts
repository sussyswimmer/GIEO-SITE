import type { SceneName } from '@/components/ui/SceneStage';
import { timeOf } from './fallback-timeline';
import { frameOf, keyUrl, nearestKey, pickSet, type FilmManifest, type FilmSet } from './film';
import { useMotionStore } from './motion-store';

/**
 * Film playback (docs/07-redesign.md §4). Each [data-film] stage reads public/film/<scene>/manifest.json
 * once it is within 1.5 screens, draws the key frame nearest the scroll position into a canvas (the
 * poster; never an <img>, so it cannot become the LCP element), then scrubs an all-intra mp4 with one
 * resident frame. Opaque films draw to a 2D canvas; alpha films go through a small WebGL compositor.
 * Still tier (reduced motion, Save-Data, a video error or a 6 s stall) crossfades the key frames instead.
 * No manifest: the stage keeps its gradient and reports data-media="none".
 */

const FADE_MS = 300; // --dur-fade
const STALL_MS = 6000;

type Video = { update(frame: number): void; destroy(): void };

const VERT = `attribute vec2 p; varying vec2 uv;
void main() { uv = vec2(0.5 + 0.5 * p.x, 0.5 - 0.5 * p.y); gl_Position = vec4(p, 0.0, 1.0); }`;
// Half a texel of clamp keeps LINEAR filtering from bleeding one half of the frame into the other.
const frag = (videoW: number) => `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D tex; varying vec2 uv;
const float H = 0.5 / ${videoW.toFixed(1)};
void main() {
  vec3 c = texture2D(tex, vec2(min(uv.x * 0.5, 0.5 - H), uv.y)).rgb;
  float a = texture2D(tex, vec2(max(0.5 + uv.x * 0.5, 0.5 + H), uv.y)).r;
  gl_FragColor = vec4(min(c, vec3(a)), a); // codec noise can push rgb above a, which a premultiplied canvas would add as glow
}`;

/** Returns a paint(video) for the canvas, or null when the alpha compositor cannot start. */
function painter(canvas: HTMLCanvasElement, set: FilmSet, alpha: boolean): ((v: HTMLVideoElement) => void) | null {
  if (!alpha) {
    const ctx = canvas.getContext('2d', { alpha: false });
    return ctx && ((v) => ctx.drawImage(v, 0, 0, set.w, set.h));
  }
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag(2 * set.w)));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(p);
  gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.clearColor(0, 0, 0, 0);
  gl.viewport(0, 0, set.w, set.h);
  return (v) => {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
}

/** Scrubs <scene>/<set>.mp4: one seek in flight, followed by at most one more (the latest target). */
function mountVideo(m: FilmManifest, set: FilmSet, stage: HTMLElement, onShown: () => void, fail: () => void): Video | null {
  const canvas = document.createElement('canvas');
  canvas.width = set.w;
  canvas.height = set.h;
  const paint = painter(canvas, set, m.alpha);
  if (!paint) return null;

  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  let dead = false;
  let seeking = false;
  let target = 0;
  let pending = 0;
  let shown = -1;

  const seek = () => {
    if (seeking || target === shown || video.readyState < 2) return;
    seeking = true;
    pending = target;
    video.currentTime = (target + 0.5) / m.fps; // mid-frame, so rounding never lands on a neighbour
  };
  const die = () => {
    if (!dead) fail();
  };
  const on = <K extends keyof HTMLVideoElementEventMap>(type: K, fn: () => void) =>
    video.addEventListener(type, () => !dead && fn());
  on('loadedmetadata', () => {
    // iOS decodes nothing until playback has started once.
    if (video.readyState < 2) video.play().then(() => video.pause(), () => {});
  });
  // The first frame shown is the seeked target, so a reader arriving mid-scene never sees frame 0 first.
  on('loadeddata', seek);
  on('canplay', seek); // a seek finishing below HAVE_CURRENT_DATA leaves its target pending
  on('seeked', () => {
    seeking = false;
    if (video.readyState >= 2) {
      paint(video);
      if (shown < 0) {
        canvas.dataset.on = '';
        onShown();
      }
      shown = pending;
      canvas.dataset.frame = String(shown);
    }
    seek();
  });
  on('error', die);
  canvas.addEventListener('webglcontextlost', die);
  // iOS Low Power Mode rejects play() and ignores preload; a stalled network sends no event either.
  const stall = setTimeout(() => shown < 0 && die(), STALL_MS);

  stage.append(canvas);
  video.src = `/film/${m.scene}/${set.id}.mp4`;

  return {
    update(frame) {
      target = frame;
      seek();
    },
    destroy() {
      dead = true;
      clearTimeout(stall);
      canvas.getContext('webgl')?.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
      video.removeAttribute('src');
      video.load();
    },
  };
}

function mountStage(stage: HTMLElement) {
  const scene = stage.dataset.film as SceneName;
  let m: FilmManifest | null = null;
  let set: FilmSet;
  let keys: HTMLCanvasElement;
  let video: Video | null = null;
  let videoOn = false; // the video has painted, so the key layer is off
  let still = false; // forced: a video error or stall
  let near = false;
  let asked = false;
  let dead = false;
  let frame = 0;
  let wantKey = -1;
  let drawnKey = -1;
  let raf = 0;
  const imgs = new Map<number, HTMLImageElement>();

  const tier = () => useMotionStore.getState().tier;
  const ready = () => {
    if (stage.dataset.media !== 'ready') stage.dataset.media = 'ready';
  };

  // Key layer: the poster, and the whole show on the Still tier (where a change of key crossfades).
  const paintKey = () => {
    const img = imgs.get(wantKey);
    if (dead || !m || wantKey === drawnKey || !img?.complete || !img.naturalWidth) return;
    const ctx = keys.getContext('2d')!;
    const from = drawnKey >= 0 && !video ? imgs.get(drawnKey) : undefined;
    drawnKey = wantKey;
    stage.dataset.key = String(drawnKey);
    const t0 = performance.now();
    cancelAnimationFrame(raf);
    const step = (now: number) => {
      const p = from ? Math.min(1, (now - t0) / FADE_MS) : 1;
      ctx.clearRect(0, 0, set.w, set.h);
      if (from && p < 1) ctx.drawImage(from, 0, 0, set.w, set.h);
      ctx.globalAlpha = p;
      ctx.drawImage(img, 0, 0, set.w, set.h);
      ctx.globalAlpha = 1;
      if (p < 1 && !dead) raf = requestAnimationFrame(step);
    };
    step(t0);
    if (!videoOn) keys.dataset.on = '';
    ready();
  };
  const showKey = () => {
    if (!m || videoOn) return;
    wantKey = nearestKey(m.keys, frame);
    if (!imgs.has(wantKey)) {
      const img = new Image();
      img.fetchPriority = 'low';
      img.src = keyUrl(m.scene, set, m.keys[wantKey]);
      img.decode().then(paintKey, () => {});
      imgs.set(wantKey, img);
    }
    paintKey();
  };

  const startVideo = () => {
    const t = tier();
    if (!m || video || still || !near || (t !== 'full' && t !== 'lite')) return;
    video = mountVideo(
      m,
      pickSet(m.sets, stage.clientWidth, stage.clientHeight, t === 'lite'), // the tier is only known here
      stage,
      () => {
        videoOn = true;
        // The video canvas sits on top: keep the poster until its fade-in is done, or the page shows through.
        setTimeout(() => videoOn && !dead && delete keys.dataset.on, FADE_MS);
        ready();
      },
      () => {
        still = true;
        stopVideo();
      },
    );
    if (!video) {
      still = true; // no alpha compositor: stop retrying on every store change
      return;
    }
    video.update(frame);
  };
  const stopVideo = () => {
    video?.destroy();
    video = null;
    videoOn = false;
    drawnKey = -1; // the key layer may be stale: repaint it for where the reader is now
    showKey();
  };

  const load = async () => {
    asked = true;
    try {
      const res = await fetch(`/film/${scene}/manifest.json`);
      if (!res.ok) {
        void res.body?.cancel(); // an unread 404 page would hold its connection open
        throw new Error(String(res.status));
      }
      const data = (await res.json()) as FilmManifest;
      if (dead) return;
      // shortcut: the sets are picked once from the box (poster at load, video at start); upgrade if a phone-to-desktop resize must swap them.
      set = pickSet(data.sets, stage.clientWidth, stage.clientHeight, false);
      const [fx, fy] = set.focus ?? [0.5, 0.5];
      stage.style.setProperty('--film-focus', `${fx * 100}% ${fy * 100}%`);
      if (data.alpha) stage.dataset.alpha = '';
      // For the page thread and the QA scripts.
      Object.assign(stage.dataset, { set: set.id, size: `${set.w},${set.h}`, focus: `${fx},${fy}` });
      if (set.threadExit) stage.dataset.threadExit = set.threadExit.join(',');
      keys = document.createElement('canvas');
      keys.width = set.w;
      keys.height = set.h;
      stage.append(keys);
      m = data;
      window.dispatchEvent(new Event('gieo:film'));
      update();
      startVideo();
    } catch {
      if (!dead) stage.dataset.media = 'none';
    }
  };

  const update = () => {
    if (!m) return;
    frame = frameOf(m, timeOf(scene, useMotionStore.getState()));
    video?.update(frame);
    showKey();
  };

  // Load within 1.5 screens; give the video back beyond 3.
  const nearIo = new IntersectionObserver(
    (entries) => {
      const e = entries[entries.length - 1];
      near = e.isIntersecting;
      if (near && !asked) void load();
      else if (near) startVideo();
    },
    { rootMargin: '150% 0px' },
  );
  const farIo = new IntersectionObserver(
    (entries) => {
      const e = entries[entries.length - 1];
      if (!e.isIntersecting && video) stopVideo();
    },
    { rootMargin: '300% 0px' },
  );
  nearIo.observe(stage);
  farIo.observe(stage);

  return {
    sync() {
      startVideo(); // the tier may have just arrived
      update();
    },
    destroy() {
      dead = true;
      cancelAnimationFrame(raf);
      nearIo.disconnect();
      farIo.disconnect();
      video?.destroy();
      stage.querySelectorAll('canvas').forEach((c) => c.remove());
      for (const key of ['media', 'alpha', 'key', 'set', 'size', 'focus', 'threadExit']) delete stage.dataset[key];
    },
  };
}

/** Mounts every film stage on the page. Call after `load`; returns the cleanup. */
export function mountFilms(): () => void {
  const stages = [...document.querySelectorAll<HTMLElement>('[data-film]')].map(mountStage);
  const unsubscribe = useMotionStore.subscribe(() => stages.forEach((s) => s.sync()));
  return () => {
    unsubscribe();
    stages.forEach((s) => s.destroy());
  };
}
