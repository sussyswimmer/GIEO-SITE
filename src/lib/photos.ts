import manifest from './photos-manifest.json';

/**
 * One processed photo. Written by scripts/process-images.mjs; never edit the manifest by hand.
 * `src` is the 1600 px WebP under /img; `variants` lists every width (AVIF + WebP).
 * consent:false entries have no files (src '', variants []): nothing is copied into public/.
 * Alt text is copy, so it lives in src/content/{vi,en}.json as photos.<id>.alt (PLAN.md §5);
 * a photo without that key is not rendered.
 */
export type Photo = {
  id: string;
  collection: 'products' | 'journal' | 'artisans' | 'team' | 'brocade';
  src: string;
  width: number;
  height: number;
  consent: boolean;
  blurDataURL: string;
  variants: { w: number; avif: string; webp: string }[];
};

const all = (manifest.photos as Photo[]).slice();

// Same rule as visiblePhotos() in scripts/process-images.mjs (tested there): production shows
// only consent === true; dev shows every entry so the dev-only Todo frames can be checked.
const visible = (list: Photo[]): Photo[] =>
  list.filter((p) => process.env.NODE_ENV !== 'production' || p.consent === true);

/** next-intl's translator, as far as a photo needs it. */
type Translator = { (key: string): string; has: (key: string) => boolean };

/** A photo with its alt text, ready for a PhotoPrint or PhotoFrame. */
export type ShownPhoto = Photo & { alt: string };

/** Adds the alt text. A photo renders only with consent and its content key photos.<id>.alt (PLAN.md §5, §6). */
export function withAlt(p: Photo | undefined, t: Translator): ShownPhoto | undefined {
  if (p?.consent !== true) return undefined;
  const key = `photos.${p.id}.alt`;
  const alt = t.has(key) ? t(key) : '';
  return alt ? { ...p, alt } : undefined;
}

/**
 * One photo by its id (the manifest's id: the file's name under assets/photos/<collection>/, slugified), never
 * by a file-name prefix. Nothing when the photo is missing, has no consent or has no alt text: the slot then
 * lays out without it.
 */
export const photo = (id: string, t: Translator): ShownPhoto | undefined =>
  withAlt(visible(all).find((p) => p.id === id), t);
