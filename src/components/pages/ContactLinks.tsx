import type { CSSProperties } from 'react';
import { getTranslations } from 'next-intl/server';
import { AnyLink, Hairline } from '@/components/ui';
import { EMAIL, FACEBOOK_LABEL, FACEBOOK_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/site';
import { fit } from './art';

// The underline is always on (the cue that does not depend on colour); it turns plum on hover and focus.
const LINK =
  'font-serif italic text-fg-heading underline decoration-lotus-pink decoration-2 underline-offset-[0.14em] transition-[text-decoration-color] duration-(--dur-hover) ease-out hover:decoration-fg-heading focus-visible:decoration-fg-heading';
const LABEL = 'block text-ui font-medium text-fg-strong';

/**
 * How to reach GIEO: the email address very large, as the page's main link (it breaks after the name, and
 * the name is sized to run the content width), then Instagram and Facebook as large rows under running
 * stitches, like the home page's Involve rows.
 * Each link slides up into place from behind the foot of its own line, one after the other (Maxwell,
 * 2026-11-19): `.slide-row` and `.slide-up` in globals.css. On the first screen that happens on load; a row
 * further down waits until it is scrolled to (the runtime's data-enter). Reduced motion: they are just there.
 */
export async function ContactLinks() {
  const t = await getTranslations('contact');
  const [user, domain] = EMAIL.split('@');
  const rows = [
    { label: t('instagramLabel'), href: INSTAGRAM_URL, text: INSTAGRAM_HANDLE },
    { label: t('facebookLabel'), href: FACEBOOK_URL, text: FACEBOOK_LABEL },
  ];

  return (
    <ul role="list">
      <li data-enter className="slide-row">
        <span className={LABEL}>{t('emailLabel')}</span>
        <AnyLink
          href={`mailto:${EMAIL}`}
          className={`${LINK} mt-1 inline-block text-mega`}
          style={{ fontSize: fit(user, 0.54, '1.5rem', 'var(--fs-mega)') }}
        >
          <span className="slide-up" style={{ '--i': 0 } as CSSProperties}>
            <span>{user}</span>
          </span>
          <span className="slide-up" style={{ '--i': 1 } as CSSProperties}>
            <span>@{domain}</span>
          </span>
        </AnyLink>
      </li>

      {rows.map(({ label, href, text }, i) => (
        <li key={href} data-enter className="slide-row mt-6 lg:mt-8">
          <Hairline />
          <div className="grid items-baseline gap-x-gap pt-4 lg:grid-cols-12 lg:pt-6">
            <span className={`${LABEL} lg:col-span-2`}>{label}</span>
            <AnyLink
              href={href}
              className={`${LINK} mt-1 inline-flex min-h-11 items-center justify-self-start text-quote lg:col-span-10 lg:mt-0`}
              style={{ fontSize: fit(text, 0.5, '1.25rem', 'var(--fs-quote)') }}
            >
              <span className="slide-up" style={{ '--i': i + 2 } as CSSProperties}>
                <span>{text}</span>
              </span>
            </AnyLink>
          </div>
        </li>
      ))}
    </ul>
  );
}
