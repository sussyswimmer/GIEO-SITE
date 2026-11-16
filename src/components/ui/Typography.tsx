import type { ComponentProps } from 'react';
import { cx } from '@/lib/cx';

/** Sentence-case label above a headline. Never tracked all-caps (DESIGN.md §7). */
export function Eyebrow({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cx('block text-ui font-medium text-fg-strong', className)} {...props} />;
}

type Level = 'display' | 'h2' | 'h3';

const SIZE: Record<Level, string> = { display: 'text-hero', h2: 'text-h2', h3: 'text-h3' };
const TAG = { display: 'h1', h2: 'h2', h3: 'h3' } as const;

type HeadingProps = ComponentProps<'h2'> & {
  /** Visual level. `display` (text-hero, 0.95 leading) is only for the unaccented word "GIEO". */
  level?: Level;
  /** Element override, e.g. an h1 styled as h2 on inner pages, or a <p> sign-off. */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span';
  /** Italic serif at weight 400 (quote/h3 sizes only: VI line-heights are measured for those). */
  italic?: boolean;
};

export function Heading({ level = 'h2', as, italic, className, ...props }: HeadingProps) {
  const Tag = as ?? TAG[level];
  return (
    <Tag
      className={cx(
        'font-serif text-fg-heading',
        SIZE[level],
        italic ? 'italic' : level === 'h3' && 'font-medium',
        className,
      )}
      {...props}
    />
  );
}

const PROSE = {
  /** On flat cream/paper only: ink-soft fails on glows and fills. */
  body: 'text-body text-fg-body max-w-(--measure)',
  /** Ink, so it is safe at the edge of a glow. Weight 300 only at this size (>= 18px). */
  lead: 'text-lead font-light text-fg-strong max-w-(--measure-lead)',
} as const;

type ProseProps = ComponentProps<'p'> & { variant?: keyof typeof PROSE; as?: 'p' | 'div' };

export function Prose({ variant = 'body', as: Tag = 'p', className, ...props }: ProseProps) {
  return <Tag className={cx(PROSE[variant], className)} {...props} />;
}

/**
 * The running stitch: a dashed rule that sews in when it enters view (docs/07 §3). Decorative, never a
 * control boundary. `vertical` fills its parent's height instead.
 */
export function Hairline({ className, vertical, ...props }: ComponentProps<'hr'> & { vertical?: boolean }) {
  return (
    <hr
      aria-hidden="true"
      data-ornament
      data-enter
      data-enter-axis={vertical ? 'y' : undefined}
      className={cx(vertical ? 'stitch-y' : 'stitch', className)}
      {...props}
    />
  );
}
