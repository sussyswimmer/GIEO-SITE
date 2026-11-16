'use client';

import { useEffect } from 'react';
import { afterLoad } from '@/lib/after-load';

const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const VIETNAMESE =
  'U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB';

const FONT_DELAY_MS = 1200; // clear of first paint and LCP even on a slow phone

const FACES = [
  { file: 'latin-500-normal', weight: '500', style: 'normal', unicodeRange: LATIN },
  { file: 'vietnamese-500-normal', weight: '500', style: 'normal', unicodeRange: VIETNAMESE },
  { file: 'latin-400-italic', weight: '400', style: 'italic', unicodeRange: LATIN },
  { file: 'vietnamese-400-italic', weight: '400', style: 'italic', unicodeRange: VIETNAMESE },
];

/**
 * Adds the below-the-fold Playfair faces (h3/h4 500, quotes and sign-off italic) after load.
 * Browsers fetch a declared face as soon as any text uses it, even off-screen, so declaring these
 * in fonts.css would put 56 KB in front of LCP. They still only download when a page uses them.
 * Without JS that text stays readable in Playfair 400.
 */
export function LateFonts() {
  useEffect(
    () =>
      afterLoad(() => {
        for (const { file, ...descriptors } of FACES) {
          const url = `url(/fonts/playfair-display-${file}.woff2) format("woff2")`;
          document.fonts.add(new FontFace('Playfair Display', url, { ...descriptors, display: 'swap' }));
        }
      }, FONT_DELAY_MS),
    [],
  );
  return null;
}
