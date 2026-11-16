// Films and still-lifes, end to end (docs/07-redesign.md §4; run: npm run film).
// Blender renders PNG masters from blender/film/{seed,weave,lotus,stills}.py into the scratch folder, then
// scripts/encode-film.mjs turns them into public/film/**. Nothing but public/film/** is written inside the repo
// (and public/art/products/, public/art/seam/ when the `art` scene is asked for).
// Usage: node scripts/render-film.mjs [--scenes seed,weave,lotus,stills] [--quality final|draft] [--resume]
//          [--scratch D:/claude-scratch/gieo/film] [--no-encode]
//        node scripts/render-film.mjs --scenes art   (blender/film/art.py: the three product portraits and the seam
//          piece, into public/art/products/ and public/art/seam/; about a minute)
//   --resume keeps frames that are already on disk (after an interrupted run); without it every frame is rendered again.
// A full final-quality run is about 45 minutes on an RTX 3070. Logs: <scratch>/logs/<scene>.log.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const has = (name) => process.argv.includes(`--${name}`);
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const win = 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
const blender = process.env.BLENDER || (fs.existsSync(win) ? win : 'blender');
const scratch = path.resolve(arg('scratch', 'D:/claude-scratch/gieo/film'));
const scenes = arg('scenes', 'seed,weave,lotus,stills').split(',');
const known = ['seed', 'weave', 'lotus', 'stills', 'art']; // art: asked for by name, never part of the default run
const bad = scenes.filter((s) => !known.includes(s));
if (bad.length) {
  console.error(`render-film: unknown scene ${bad.join(', ')} (known: ${known.join(', ')})`);
  process.exit(1);
}
for (const d of ['raw', 'logs', 'blender-tmp']) fs.mkdirSync(path.join(scratch, d), { recursive: true });
// Blender's own temp files go to the scratch drive too: C: is short on space.
const env = { ...process.env, TEMP: path.join(scratch, 'blender-tmp'), TMP: path.join(scratch, 'blender-tmp') };

for (const scene of scenes) {
  const log = path.join(scratch, 'logs', `${scene}.log`), fd = fs.openSync(log, 'w'), t0 = Date.now();
  console.log(`render-film: ${scene} -> ${path.join(scratch, 'raw', scene)} (log ${log})`);
  const r = spawnSync(blender, ['-b', '--factory-startup', '--python-exit-code', '1', '-P', path.join(ROOT, 'blender/film', `${scene}.py`), '--',
    '--quality', arg('quality', 'final'), '--out', path.join(scratch, 'raw'), ...(has('resume') ? ['--resume'] : [])], { env, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd);
  const done = fs.readFileSync(log, 'utf8').split(/\r?\n/).filter((l) => l.startsWith('FILM_DONE'));
  // --python-exit-code makes a raised exception fail the run; the scene's own FILM_DONE line is the proof it finished.
  if (r.error || r.status !== 0 || !done.length) {
    console.error(`render-film: ${scene} failed (${r.error?.message ?? `exit ${r.status}`}). Last lines of ${log}:`);
    console.error(fs.readFileSync(log, 'utf8').split(/\r?\n/).slice(-15).join('\n'));
    process.exit(1);
  }
  console.log(`render-film: ${scene} ${done.length > 1 ? `${done.length} stills` : done[0].replace(/^FILM_DONE \S+ /, '')} in ${Math.round((Date.now() - t0) / 1000)} s`);
}

if (!has('no-encode')) {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts/encode-film.mjs'), '--scenes', scenes.join(','), '--raw', path.join(scratch, 'raw'),
    '--sheets', path.join(scratch, 'sheets'), '--tmp', path.join(scratch, 'tmp')], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
