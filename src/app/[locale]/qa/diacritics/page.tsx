import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container, Section } from '@/components/ui';

// Phase 0 check (05-build-plan.md): the 01-brand.md §4 test string at 96px and 16px in every face.
// Dev-only fixture; hard-coded copy is fine here. Build with NEXT_PUBLIC_QA=1 to include it.
export const metadata: Metadata = {
  title: 'QA: diacritics',
  robots: { index: false, follow: false },
};

const SAMPLE = "Ngày Phụ Nữ Việt Nam · thổ cẩm H'Mông · Chie Dù Pù Dù Pà · Gieo mầm hy vọng · ỗ ữ ặ ẫ ợ";

// Each face at the tightest line-height the system pairs it with, so stacked marks are stress-tested.
const FACES = [
  { label: 'Playfair Display 400', className: 'font-serif font-normal', lh: '--lh-h2' },
  { label: 'Playfair Display 500', className: 'font-serif font-medium', lh: '--lh-h4' },
  { label: 'Playfair Display 400 italic', className: 'font-serif font-normal italic', lh: '--lh-quote' },
  { label: 'Be Vietnam Pro 300', className: 'font-sans font-light', lh: '--lh-ui' },
  { label: 'Be Vietnam Pro 400', className: 'font-sans font-normal', lh: '--lh-ui' },
  { label: 'Be Vietnam Pro 500', className: 'font-sans font-medium', lh: '--lh-ui' },
];
const SIZES = [
  { label: '96px', value: '6rem' },
  { label: '16px', value: '1rem' },
];

export default function DiacriticsQA() {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_QA !== '1') notFound();

  return (
    <Section tone="cream">
      <Container className="pt-nav">
        <h1 className="text-h3">Diacritics test</h1>
        {SIZES.map((size) => (
          <section key={size.label} className="mt-16">
            <h2 className="text-h4">{size.label}</h2>
            {FACES.map((face) => (
              <figure key={face.label} className="mt-8 border-t border-blush-line pt-4">
                <figcaption className="font-sans text-caption text-ink">
                  {face.label} · {size.label} · line-height var({face.lh})
                </figcaption>
                <p
                  lang="vi"
                  className={`mt-3 text-ink ${face.className}`}
                  style={{ fontSize: size.value, lineHeight: `var(${face.lh})` }}
                >
                  {SAMPLE}
                </p>
              </figure>
            ))}
          </section>
        ))}
      </Container>
    </Section>
  );
}
