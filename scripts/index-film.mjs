// Films, second step (after scripts/encode-film.mjs): every public/film/<scene>/<set>.mp4 again as a raw
// H.264 stream with an index of where each frame starts, for the player's direct decoder (film-stage.ts:
// WebCodecs shows any frame in a few ms; seeking a <video> took 25 to 100 ms a frame, which read as lag).
// No re-encode: the same all-intra frames, copied out of the mp4. Browsers without WebCodecs keep the mp4.
// Usage: node scripts/index-film.mjs
// Writes public/film/<scene>/<set>.h264 and <set>.h264.json: { codec, offsets } with one byte offset per
// frame and the file's length last.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILM = path.join(ROOT, 'public/film');
const die = (m) => {
  console.error(`index-film: ${m}`);
  process.exit(1);
};
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { maxBuffer: 1 << 28, encoding: 'utf8' });
  if (r.status !== 0) die(`${cmd} failed: ${r.stderr}`);
  return r.stdout;
};

for (const scene of fs.readdirSync(FILM)) {
  const manifestPath = path.join(FILM, scene, 'manifest.json');
  if (!fs.existsSync(manifestPath)) continue;
  const { frames, sets } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const { id } of sets) {
    const mp4 = path.join(FILM, scene, `${id}.mp4`);
    const raw = path.join(FILM, scene, `${id}.h264`);
    run('ffmpeg', ['-y', '-v', 'error', '-i', mp4, '-an', '-c:v', 'copy', '-bsf:v', 'h264_mp4toannexb', '-f', 'h264', raw]);
    const bytes = fs.readFileSync(raw);
    // A frame starts at its access unit delimiter or, without one, at its parameter set (every frame is a key frame
    // and carries its own SPS). Start codes are 00 00 01, with or without a leading 00.
    const offsets = [];
    let unit = -1; // where the frame being read began
    for (let i = 0; i + 3 < bytes.length; i++) {
      if (bytes[i] !== 0 || bytes[i + 1] !== 0 || bytes[i + 2] !== 1) continue;
      const type = bytes[i + 3] & 31;
      const at = i > 0 && bytes[i - 1] === 0 ? i - 1 : i;
      if (type === 9 || (type === 7 && unit < 0)) {
        offsets.push(at);
        unit = at;
      } else if (type === 5) unit = -1; // the picture itself: the next parameter set opens a new frame
      i += 3;
    }
    if (offsets.length !== frames) die(`${scene}/${id}: ${offsets.length} frames found, the manifest says ${frames}`);
    offsets.push(bytes.length);
    const sps = bytes.indexOf(Buffer.from([0, 0, 1, 0x67]));
    if (sps < 0) die(`${scene}/${id}: no SPS`);
    const codec = `avc1.${[...bytes.subarray(sps + 4, sps + 7)].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
    fs.writeFileSync(`${raw}.json`, JSON.stringify({ codec, offsets }));
    console.log(`${scene}/${id}.h264  ${frames} frames  ${bytes.length} bytes  ${codec}`);
  }
}
