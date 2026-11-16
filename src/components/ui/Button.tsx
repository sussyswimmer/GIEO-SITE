import type { ComponentProps } from 'react';
import { cx } from '@/lib/cx';
import { AnyLink, type AnyLinkProps } from './AnyLink';

type Variant = 'primary' | 'secondary';

// Labels may wrap (Vietnamese runs long), so no fixed height: min 48px plus padding.
// Hover lifts and adds the pink glow; press scales; reduced motion zeroes both (tokens.css).
const BASE = cx(
  'inline-flex min-h-12 items-center justify-center rounded-pill px-6 py-3 text-center text-ui font-medium',
  'transition-[translate,scale,box-shadow,background-color,color] duration-(--dur-hover) ease-out',
  'not-disabled:hover:translate-y-(--lift) not-disabled:hover:shadow-lift',
  'not-disabled:active:translate-y-0 not-disabled:active:scale-(--press-scale) active:duration-(--dur-press)',
  'focus-visible:shadow-[var(--elev-halo)]',
  'disabled:cursor-not-allowed disabled:opacity-45',
);

const VARIANT: Record<Variant, string> = {
  // Role colours, so both invert inside the plum scope (cream fill, plum label).
  primary: 'bg-fill-primary text-fg-on-fill',
  secondary: 'border border-fg-heading text-fg-heading not-disabled:hover:bg-(--petal-soft-a40)',
};

type ButtonProps = ComponentProps<'button'> & { variant?: Variant };

/** For form submits and toggles. Navigation uses ButtonLink. */
export function Button({ variant = 'primary', type = 'button', className, ...props }: ButtonProps) {
  return <button type={type} className={cx(BASE, VARIANT[variant], className)} {...props} />;
}

/** Same look on a link: internal paths keep the locale; http/mailto render a plain <a>. */
export function ButtonLink({ variant = 'primary', className, ...props }: AnyLinkProps & { variant?: Variant }) {
  return <AnyLink className={cx(BASE, VARIANT[variant], className)} {...props} />;
}
