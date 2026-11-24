import fs from 'node:fs';
import path from 'node:path';
import { listStills } from '@/lib/stills';

const PUBLIC = path.join(process.cwd(), 'public');

/**
 * A decorative picture on a transparent ground. `small` is its 800 px version, for phones; `smallW` is that
 * file's real width (800 is its long edge). `srcSet`, when set, lists every width on disk (-640, -800, -1200
 * and the full file; scripts/art-variants.mjs makes the extra two), so a phone at any density takes the
 * nearest file instead of jumping from 800 to the full 1600.
 */
export type Art = { src: string; small?: string; smallW?: number; srcSet?: string; w: number; h: number; products: boolean };

/** Canvas size from a WebP header: VP8X (alpha, extended), VP8L (lossless) or VP8 (plain lossy). */
function webpSize(file: string): [number, number] | undefined {
  const b = fs.readFileSync(file).subarray(0, 30);
  const kind = b.toString('latin1', 12, 16);
  if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (kind === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
}

/** A Blender still-life by name (public/film/stills), or nothing if it has not been rendered. */
export const still = (name: string): Art | undefined => listStills().find((s) => s.name === name);

/**
 * An illustration from public/art (docs/08 §2), e.g. art('pages/about') or art('objects/books'), read when
 * the page is built; nothing if the file is not there. `products` says the picture shows products, so it
 * carries the partner credit.
 */
export function art(name: string, products = false): Art | undefined {
  const src = `/art/${name}.webp`;
  const file = path.join(PUBLIC, src);
  const size = fs.existsSync(file) ? webpSize(file) : undefined;
  const small = `/art/${name}-800.webp`;
  const smallFile = path.join(PUBLIC, small);
  const hasSmall = fs.existsSync(smallFile);
  if (!size) return undefined;
  const widths: string[] = [];
  for (const suffix of ['-640', '-800', '-1200']) {
    const f = path.join(PUBLIC, `/art/${name}${suffix}.webp`);
    const w = fs.existsSync(f) ? webpSize(f)?.[0] : undefined;
    if (w) widths.push(`/art/${name}${suffix}.webp ${w}w`);
  }
  const srcSet = widths.length > 1 ? [...widths, `${src} ${size[0]}w`].join(', ') : undefined;
  return { src, small: hasSmall ? small : undefined, smallW: hasSmall ? webpSize(smallFile)?.[0] : undefined, srcSet, w: size[0], h: size[1], products };
}

/**
 * A font size that sets `text` on one line across the content width: `em` is the line's width per
 * lowercase character (Playfair italic runs 0.38 to 0.54; a capital counts as one and a half), clamped
 * between `min` and `max` (CSS lengths).
 */
export function fit(text: string, em: number, min: string, max: string) {
  const chars = [...text].reduce((n, c) => n + (c === c.toLowerCase() ? 1 : 1.5), 0);
  return `clamp(${min}, calc(min(100vw - 2 * var(--gutter), var(--wrap-max)) / ${(chars * em).toFixed(2)}), ${max})`;
}
