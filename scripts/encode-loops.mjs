// Encodes the short scrub clips and the ambient mist loop into public/art/ (docs/08-fuller.md §2).
// usage: node scripts/encode-loops.mjs <folder with sprout.mp4, thread.mp4, books.mp4, mist.mp4>
// Scrub clips are all-intra H.264 (every frame a key frame, so seeking is exact) at 12 fps, like the films.
// Their flat ground is lifted to just above --cream, so `mix-blend-mode: darken` on a cream section drops it.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const src = process.argv[2];
if (!src) throw new Error('usage: node scripts/encode-loops.mjs <source folder>');
const out = path.resolve('public/art/loops');
fs.mkdirSync(out, { recursive: true });
const ff = (...args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });

const TARGET = [250, 243, 237]; // 3 above --cream #F7F0EA in each channel
const CLIPS = { sprout: 720, books: 720, thread: 1280 }; // output width

for (const [name, width] of Object.entries(CLIPS)) {
  const input = path.join(src, `${name}.mp4`);
  const first = path.join(out, `${name}-first.png`);
  ff('-i', input, '-frames:v', '1', first);
  // the clip's own ground colour, read from a corner of its first frame
  const { data } = await sharp(first).extract({ left: 12, top: 12, width: 8, height: 8 }).resize(1, 1).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const gain = TARGET.map((t, i) => (t / data[i]).toFixed(4));
  const look = `fps=12,scale=${width}:-2:flags=lanczos,colorchannelmixer=rr=${gain[0]}:gg=${gain[1]}:bb=${gain[2]},format=yuv420p`;
  const mp4 = path.join(out, `${name}.mp4`);
  ff('-i', input, '-an', '-vf', look, '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-g', '1', '-bf', '0',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', mp4);
  // posters: the first frame, and the last one for reduced motion (the grown sprout, the laid thread)
  ff('-i', mp4, '-frames:v', '1', first);
  await sharp(first).webp({ quality: 80 }).toFile(path.join(out, `${name}.webp`));
  ff('-sseof', '-0.2', '-i', mp4, '-frames:v', '1', '-update', '1', first);
  await sharp(first).webp({ quality: 80 }).toFile(path.join(out, `${name}-end.webp`));
  fs.rmSync(first);
  const frames = execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames,width,height', '-of', 'csv=p=0', mp4]).toString().trim();
  console.log(`${name}.mp4 ground ${[...data].join(',')} gain ${gain.join(',')} [w,h,frames] ${frames} ${(fs.statSync(mp4).size / 1048576).toFixed(2)} MB`);
}

// The mist loop plays on its own (muted, looping), so it keeps a normal GOP and stays small.
const mist = path.resolve('public/art/vision/dusk-mist.mp4');
ff('-i', path.join(src, 'mist.mp4'), '-an', '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-movflags', '+faststart', mist);
console.log(`dusk-mist.mp4 ${(fs.statSync(mist).size / 1048576).toFixed(2)} MB`);
