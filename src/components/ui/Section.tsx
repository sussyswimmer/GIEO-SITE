import type { CSSProperties, ReactNode } from 'react';
import { cx } from '@/lib/cx';
import { Glow, type GlowKind } from './Glow';

/** plum is the one dark section: it sets the [data-tone="plum"] colour scope (globals.css) and keeps a hard edge. */
type Tone = 'cream' | 'paper' | 'plum';
const TONE: Record<Tone, string> = { cream: 'var(--cream)', paper: 'var(--paper)', plum: 'var(--plum-ink)' };

const PAD = { default: 'py-section', sm: 'py-section-sm', none: '' } as const;

export type SectionProps = {
  as?: 'section' | 'header' | 'footer' | 'div';
  tone?: Tone;
  /** Tone of the section above. The top --handoff fades from it, so there is never a hard edge. */
  from?: Tone;
  glow?: GlowKind;
  pad?: keyof typeof PAD;
  id?: string;
  labelledBy?: string;
  /** Which gutter the page thread runs down beside this section (home page, >= 1024). */
  thread?: 'left' | 'right';
  className?: string;
  /** Extra classes for the glow layer, for a section whose height is not its first screen. */
  glowClassName?: string;
  children: ReactNode;
};

/**
 * Layering contract (DESIGN.md §1): the <section> is `relative` with NO z-index, transform,
 * filter, opacity or isolation; tone and glow paint at z -1; content sits at z 1. Breaking
 * this hides the section backgrounds behind the z 0 layer (the page thread; once the R3F canvas).
 */
export function Section({
  as: Tag = 'section',
  tone = 'cream',
  from,
  glow,
  pad = 'default',
  id,
  labelledBy,
  thread,
  className,
  glowClassName,
  children,
}: SectionProps) {
  const layer = { '--tone': TONE[tone], '--from': TONE[from ?? tone] } as CSSProperties;
  return (
    <Tag
      id={id}
      aria-labelledby={labelledBy}
      data-tone={tone}
      data-thread-side={thread}
      className={cx('relative flex flex-col', PAD[pad], className)}
    >
      <div aria-hidden="true" className="section-bg" style={layer} />
      {glow && <Glow kind={glow} className={glowClassName} />}
      <div className="relative z-(--z-content) flex flex-1 flex-col">{children}</div>
    </Tag>
  );
}
