import type { ReactNode } from 'react';
import { cx } from '@/lib/cx';

/**
 * Serif italic pull quote with a decorative pink opening mark (DESIGN.md §5): blockquote::before
 * with empty alt text (`content: "“" / ""`), so assistive tech reads only the quote. A browser
 * without the alt syntax drops the mark, never the quote. Below 1024 it sits above the text; at
 * >=1024 it hangs in the margin.
 */
export function PullQuote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <figure className={cx('relative', className)}>
      <blockquote
        className={cx(
          'relative max-w-[24ch] text-balance font-serif text-quote italic text-plum-ink',
          "before:mb-2 before:block before:text-[1.6em] before:leading-none before:text-lotus-pink before:content-['“'_/_'']",
          'lg:before:absolute lg:before:-top-[0.1em] lg:before:-left-[0.55em] lg:before:mb-0',
        )}
      >
        {children}
      </blockquote>
    </figure>
  );
}
