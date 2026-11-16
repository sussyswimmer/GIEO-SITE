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

const pick = (collection: Photo['collection'], prefix?: string): Photo | undefined =>
  visible(all).find((p) => p.collection === collection && (!prefix || p.id.startsWith(prefix)));

export const journalPhotos: Photo[] = visible(all.filter((p) => p.collection === 'journal'));

/**
 * Product and brocade images. Product files are matched by name prefix: tote-*, mug-*, coaster-*.
 * A missing entry stays undefined and its PhotoFrame renders nothing (dev: Todo).
 */
export const collectionPhotos = {
  hmong: {
    brocade: pick('brocade'),
    tote: pick('products', 'tote'),
    mug: pick('products', 'mug'),
    coaster: pick('products', 'coaster'),
  },
};
