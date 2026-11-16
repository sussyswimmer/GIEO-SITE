import { cx } from '@/lib/cx';
import { AnyLink, type AnyLinkProps } from './AnyLink';

/**
 * Inline link in copy: plum text, underline always on (the non-colour cue). The pink
 * underline is decorative; it turns plum and thicker on hover and focus (DESIGN.md §5).
 */
export function TextLink({ className, ...props }: AnyLinkProps) {
  return (
    <AnyLink
      className={cx(
        'text-fg-heading underline decoration-lotus-pink decoration-[length:max(1.5px,0.08em)] underline-offset-[0.2em]',
        'transition-[text-decoration-color] duration-(--dur-hover) ease-out',
        'hover:decoration-fg-heading hover:decoration-2 focus-visible:decoration-fg-heading focus-visible:decoration-2',
        className,
      )}
      {...props}
    />
  );
}
