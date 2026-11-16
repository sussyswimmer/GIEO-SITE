import { Link } from '@/i18n/navigation';
import { cx } from '@/lib/cx';

const DEV = process.env.NODE_ENV !== 'production';

/**
 * Home link with a NEUTRAL placeholder: the letters "GIEO" in Be Vietnam Pro 500, tracked.
 * It must never imitate the wordmark: no Playfair, no swash I, no lotus, no circle (CLAUDE.md #8).
 * TODO(logo-svg): swap the text for GIEO's own file, e.g.
 *   <img src="/brand/gieo-logo.svg" alt="GIEO" width={…} height={…} />  (min width 96px, clear
 *   space = height of its "O").
 * TODO(logo-svg): GIEO's own lotus paths take `pathLength={1}` in the thread below; the placeholder
 * renders nothing in production. Never draw a lotus or retype the wordmark.
 */
export function Logo({
  className,
  siteName,
  homeLabel,
  draw,
}: {
  className?: string;
  siteName: string;
  homeLabel: string;
  draw?: 'load' | 'view';
}) {
  return (
    <Link
      href="/"
      title={DEV ? 'TODO(logo-svg)' : undefined}
      className={cx(
        'relative inline-flex min-h-11 min-w-24 items-center rounded-pill font-sans text-ui font-medium tracking-(--ls-logo-placeholder) text-plum-ink',
        // Dev-only dashed outline, dropped while focused so the real focus ring shows.
        DEV && 'not-focus-visible:outline-1 not-focus-visible:outline-dashed not-focus-visible:outline-ink-soft',
        className,
      )}
    >
      {siteName}
      <span className="sr-only">{' '}{homeLabel}</span>
      {DEV && draw && (
        <svg
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 96 2"
          width={96}
          height={2}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
          data-draw={draw === 'view' ? 'view' : undefined}
          className={cx('absolute bottom-1 left-4', draw === 'load' && 'draw-on')}
        >
          <path d="M0 1H96" pathLength={1} strokeDasharray={1} />
        </svg>
      )}
    </Link>
  );
}
