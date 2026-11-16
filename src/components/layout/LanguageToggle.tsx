'use client';

import { useLocale } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cx } from '@/lib/cx';

const CHIP = 'grid h-8 w-9 place-items-center rounded-pill text-ui font-medium';

/**
 * VI | EN. The current locale is a plum chip (not a link); the other is a real link to the
 * same page in that language, so it works without JS and crawlers see it.
 */
export function LanguageToggle({
  className,
  groupLabel,
  switchLabel,
}: {
  className?: string;
  groupLabel: string;
  switchLabel: string;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div role="group" aria-label={groupLabel} className={cx('flex', className)}>
      {routing.locales.map((l) =>
        l === locale ? (
          <span key={l} aria-current="true" className="grid size-11 place-items-center">
            <span className={cx(CHIP, 'bg-plum-ink text-cream')}>{l.toUpperCase()}</span>
          </span>
        ) : (
          <Link
            key={l}
            href={pathname}
            locale={l}
            lang={l}
            onClick={(e) => {
              // A Link can't know the #fragment at render time; keep it so /get-involved#mentor stays put.
              const { hash } = window.location;
              if (!hash) return;
              e.preventDefault();
              router.push(pathname + hash, { locale: l });
            }}
            className="group grid size-11 place-items-center rounded-pill transition-[scale] duration-(--dur-press) ease-out active:scale-(--press-scale)"
          >
            <span
              className={cx(
                CHIP,
                'text-plum-ink transition-[background-color] duration-(--dur-hover) ease-out group-hover:bg-(--petal-soft-a40)',
              )}
            >
              {l.toUpperCase()}
            </span>
            <span className="sr-only">{' '}{switchLabel}</span>
          </Link>
        ),
      )}
    </div>
  );
}
