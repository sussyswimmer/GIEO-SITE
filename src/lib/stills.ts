import fs from 'node:fs';
import path from 'node:path';

export type Still = { name: string; src: string; fg?: string; w: number; h: number; products: boolean };

const DIR = path.join(process.cwd(), 'public', 'film', 'stills');

/** Canvas size from a WebP's VP8X header (every still has alpha, so it has one); 4:3 if it is some other WebP. */
function sizeOf(file: string): [number, number] {
  const b = fs.readFileSync(path.join(DIR, file)).subarray(0, 30);
  return b.toString('latin1', 12, 16) === 'VP8X' ? [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)] : [1600, 1200];
}

/**
 * The Blender still-lifes in public/film/stills (docs/07 §4), read when the page is rendered (at build for
 * the static pages). `<name>-fg.webp` is that still's foreground layer for parallax. No folder yet: no stills,
 * and the sections that use them lay out without.
 * `first` names the stills a layout wants up front, in order; whatever else exists follows alphabetically.
 */
export function listStills(first: readonly string[] = []): Still[] {
  let files: string[] = [];
  try {
    files = fs.readdirSync(DIR).filter((f) => f.endsWith('.webp')).sort();
  } catch {
    // not rendered yet
  }
  const have = new Set(files);
  const rank = (s: Still) => (first.indexOf(s.name) + 1 || first.length + 1);
  return files
    .filter((f) => !f.endsWith('-fg.webp'))
    .map((f) => {
      const name = f.slice(0, -'.webp'.length);
      const [w, h] = sizeOf(f);
      return {
        name,
        src: `/film/stills/${f}`,
        fg: have.has(`${name}-fg.webp`) ? `/film/stills/${name}-fg.webp` : undefined,
        w,
        h,
        // A still that shows products carries the partner credit (docs/07 §1).
        products: /product|bag/i.test(name),
      };
    })
    .sort((a, b) => rank(a) - rank(b));
}
