import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { createTranslator, hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';

// Social card, 1200 x 630. Satori reads only TTF/OTF/WOFF (no WOFF2), so the Playfair 400 WOFF
// files come from the pinned @fontsource devDependency. Latin and Vietnamese subsets are both
// loaded so VI diacritics and ASCII render from the same face.
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Next 15.5 passes image routes a plain params object (pages get a Promise); `await` takes both.
type Props = { params: { locale: string } | Promise<{ locale: string }> };

// generateImageMetadata runs outside the server-components layer, where getTranslations is a
// client stub, so both exports use next-intl's environment-agnostic translator.
async function metaT(params: Props['params']) {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const messages = (await import(`../../content/${locale}.json`)).default;
  return createTranslator({ locale, messages, namespace: 'meta' });
}

// Alt text is copy, so it comes from the content files per locale (a static `alt` export cannot).
export async function generateImageMetadata({ params }: Props) {
  const t = await metaT(params);
  return [{ id: 'card', alt: t('description'), size, contentType }];
}

// Satori does not read CSS variables, and the hex values may live only in tokens.css.
// Read the named token from that file so the card matches the site palette.
async function token(name: string): Promise<string> {
  const css = await readFile(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');
  const hit = css.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`));
  if (!hit) throw new Error(`tokens.css has no --${name}`);
  return hit[1];
}

async function font(file: string): Promise<ArrayBuffer> {
  const buf = await readFile(join(process.cwd(), 'node_modules/@fontsource/playfair-display/files', file));
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

export default async function OpengraphImage({ params }: Props) {
  const t = await metaT(params);
  const [cream, plum, peach, petal] = await Promise.all([
    token('cream'),
    token('plum-ink'),
    token('peach-glow'),
    token('petal-soft'),
  ]);
  const [latin, vietnamese] = await Promise.all([
    font('playfair-display-latin-400-normal.woff'),
    font('playfair-display-vietnamese-400-normal.woff'),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: 88,
          backgroundColor: cream,
          // The fade ends at the same colour with alpha 0: satori blends 'transparent' through black (grey halo).
          backgroundImage: `radial-gradient(ellipse 60% 55% at 16% 10%, ${peach} 0%, ${peach}00 70%), radial-gradient(ellipse 40% 40% at 90% 92%, ${petal} 0%, ${petal}00 70%)`,
          fontFamily: 'Playfair Display',
        }}
      >
        {/* TODO(logo-svg): GIEO's logo file goes top-left. Never a typeset "GIEO" in its place (CLAUDE.md #8). */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', width: 120, height: 1, backgroundColor: petal, marginBottom: 40 }} />
          {/* 1.26: the measured VI minimum for Playfair roman (DESIGN.md §3); EN uses it too. */}
          <div style={{ display: 'flex', fontSize: 76, lineHeight: 1.26, color: plum, maxWidth: 960 }}>
            {t('description')}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Playfair Display', data: latin, weight: 400, style: 'normal' },
        { name: 'Playfair Display', data: vietnamese, weight: 400, style: 'normal' },
      ],
    },
  );
}
