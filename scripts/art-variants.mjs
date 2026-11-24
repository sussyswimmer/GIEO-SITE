// Extra widths for the sub-page header illustrations (public/art/pages), the LCP element on every
// sub-page phone screen. Writes <name>-640.webp and <name>-1200.webp beside <name>.webp (1600 wide) and
// <name>-800.webp; src/components/pages/art.ts lists whichever exist in the srcset.
// The illustrations have no masters in the repo (docs/08 §2), so the variants come from the 1600 px file.
// Usage: node scripts/art-variants.mjs [--force] [dir=public/art/pages]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const force = process.argv.includes('--force');
const dir = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'public/art/pages';
const WIDTHS = [
  [640, 80],
  [1200, 78],
];

for (const file of fs.readdirSync(dir).filter((f) => /^[a-z-]+\.webp$/.test(f) && !/-\d+\.webp$/.test(f))) {
  const src = path.join(dir, file);
  const { width } = await sharp(src).metadata();
  for (const [w, quality] of WIDTHS) {
    if (w >= width) continue;
    const out = src.replace(/\.webp$/, `-${w}.webp`);
    if (!force && fs.existsSync(out)) continue;
    await sharp(src).resize({ width: w }).webp({ quality, alphaQuality: 90, effort: 6 }).toFile(out);
    console.log(`${out}  ${Math.round(fs.statSync(out).size / 1024)} KB`);
  }
}
