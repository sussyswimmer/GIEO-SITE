import gsap from 'gsap';
import { SCRUB } from './motion';

/**
 * Short scrubbed clips and looping pictures (docs/08 §2, public/art/loops and public/art/vision).
 *
 * [data-clip="/art/loops/<name>"] (ScrubClip.tsx): an all-intra mp4 whose frame follows the box's passage
 * through the screen, damped like the films: frame 0 as its top enters at the bottom, the last frame when
 * its centre reaches 40 % of the screen height. Everything is drawn into a canvas, the first frame
 * (<name>.webp) as the poster, so nothing here can become the LCP element. The files are asked for once the
 * box is within 1 screen. Reduced motion, Save-Data, a slow connection, a stalled video or a video error show <name>-end.webp instead.
 *
 * video[data-loop][data-src]: a muted loop that plays only while it is on screen (src set on first sight),
 * and not at all under reduced motion or Save-Data: the picture under it stays.
 *
 * Call inside the page's gsap.context, so the scrubs are reverted with it; returns the rest of the cleanup.
 */
export function mountClips(reduced: boolean): () => void {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  const still = reduced || Boolean(conn?.saveData) || /(^|-)2g$|^3g$/.test(conn?.effectiveType ?? '');
  const undo: (() => void)[] = [];

  document.querySelectorAll<HTMLElement>('[data-clip]').forEach((box) => {
    const base = box.dataset.clip!;
    const frames = Number(box.dataset.frames);
    const fps = Number(box.dataset.fps);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;
    box.append(canvas);
    let video: HTMLVideoElement | null = null;
    let end = still; // show the last frame as a picture: no scrubbing
    let dead = false;
    let seeking = false;
    let target = 0;
    let pending = 0;
    let shown = -1;
    let stall: ReturnType<typeof setTimeout> | undefined;

    const draw = (src: HTMLImageElement | HTMLVideoElement, w: number, h: number) => {
      if (canvas.width !== w || canvas.height !== h) Object.assign(canvas, { width: w, height: h });
      ctx.drawImage(src, 0, 0, w, h);
      canvas.dataset.on = '';
    };
    const picture = (suffix: '' | '-end') => {
      const img = new Image();
      img.src = `${base}${suffix}.webp`;
      // the poster must not land on top of a frame the video has already drawn
      img.decode().then(() => !dead && (suffix ? end : !end && shown < 0) && draw(img, img.naturalWidth, img.naturalHeight), () => {});
    };
    const seek = () => {
      if (!video || seeking || target === shown || video.readyState < 2) return;
      seeking = true;
      pending = target;
      video.currentTime = (target + 0.5) / fps; // mid-frame, so rounding never lands on a neighbour
    };
    const fail = () => {
      if (dead || end) return;
      end = true;
      video?.removeAttribute('src');
      video?.load();
      video = null;
      picture('-end');
    };
    const start = () => {
      picture(end ? '-end' : '');
      if (end) return;
      const v = (video = document.createElement('video'));
      v.muted = true;
      v.playsInline = true;
      v.preload = 'auto';
      // iOS decodes nothing until playback has started once.
      v.addEventListener('loadedmetadata', () => v.readyState < 2 && v.play().then(() => v.pause(), () => {}));
      v.addEventListener('loadeddata', seek);
      v.addEventListener('canplay', seek);
      v.addEventListener('seeked', () => {
        seeking = false;
        if (dead || v.readyState < 2) return;
        draw(v, v.videoWidth, v.videoHeight);
        shown = pending;
        seek();
      });
      v.addEventListener('error', fail);
      v.src = `${base}.mp4`;
      stall = setTimeout(() => shown < 0 && fail(), 6000); // no frame in 6 s: show the end picture instead
    };

    const near = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        near.disconnect();
        start();
      },
      { rootMargin: '100% 0px' },
    );
    near.observe(box);
    if (!end) {
      const proxy = { p: 0 };
      gsap.to(proxy, {
        p: 1,
        ease: 'none',
        scrollTrigger: { trigger: box, start: 'top bottom', end: 'center 40%', scrub: SCRUB },
        onUpdate: () => {
          target = Math.round(proxy.p * (frames - 1));
          seek();
        },
      });
    }
    undo.push(() => {
      dead = true;
      clearTimeout(stall);
      near.disconnect();
      video?.removeAttribute('src');
      video?.load();
      canvas.remove();
    });
  });

  if (!still) {
    const seen = new IntersectionObserver((entries) =>
      entries.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        if (!e.isIntersecting) return v.pause();
        if (!v.src && v.dataset.src) {
          v.addEventListener('playing', () => (v.dataset.on = ''), { once: true }); // fades in over the still (globals.css)
          v.src = v.dataset.src;
        }
        v.play().catch(() => {}); // refused (Low Power Mode): the picture under it stays
      }),
    );
    const loops = [...document.querySelectorAll<HTMLVideoElement>('video[data-loop]')];
    loops.forEach((v) => seen.observe(v));
    undo.push(() => {
      seen.disconnect();
      loops.forEach((v) => v.pause());
    });
  }
  return () => undo.forEach((fn) => fn());
}
