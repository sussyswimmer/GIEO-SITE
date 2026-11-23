// Rebuild public/models/{lotus,seed,weave}.glb and weave-cloth.webp from blender/scripts/*.py (run: npm run models).
// Name models to rebuild only those: npm run models -- weave
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const win = 'C:\\Program Files\\Blender Foundation\\Blender 5.2\\blender.exe';
const blender = process.env.BLENDER || (existsSync(win) ? win : 'blender');

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`failed: ${cmd} ${args.join(' ')}`);
    process.exit(r.status || 1);
  }
}

const ALL = ['lotus', 'seed', 'weave'];
const only = process.argv.slice(2);
for (const name of only) if (!ALL.includes(name)) throw new Error(`unknown model ${name}: one of ${ALL.join(', ')}`);

for (const name of only.length ? only : ALL) {
  const raw = join(root, 'blender', 'out', `${name}.glb`);
  const final = join(root, 'public', 'models', `${name}.glb`);
  mkdirSync(dirname(raw), { recursive: true });
  mkdirSync(dirname(final), { recursive: true });

  run(blender, [
    '-b', '--factory-startup', '-P', join(root, 'blender', 'scripts', `${name}.py`), '--',
    '--export', raw, '--render', join(root, 'blender', 'renders', name), '--blend', join(root, 'blender', 'scenes', `${name}.blend`),
  ]);
  // meshopt only quantises and compresses: hierarchy, names, extras and animation are untouched.
  run(process.execPath, [join(root, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js'), 'meshopt', raw, final, '--level', 'high']);

  console.log(`${name}.glb raw ${statSync(raw).size} B -> final ${statSync(final).size} B`);
}

// The cloth is a flat 64x64 tone (the showroom colours its brocade in the shader): no upscale, lossless so the tone stays exact.
if (!only.length || only.includes('weave')) await sharp(join(root, 'blender', 'out', 'weave-cloth.png')).webp({ lossless: true, effort: 6 }).toFile(join(root, 'public', 'models', 'weave-cloth.webp'));
console.log('weave-cloth.webp', statSync(join(root, 'public', 'models', 'weave-cloth.webp')).size, 'B');
