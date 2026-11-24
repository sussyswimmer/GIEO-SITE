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
 * How to reach GIEO: three rows alike, the email, Instagram and Facebook, each a label beside a large link
 * under a running stitch, like the home page's Involve rows. All three links are set at one size (Maxwell,
 * 2026-11-24: "make email, insta and facebook all equal sizes"; the email used to run the full width), taken
 * from the longest of them so each fits its line; the email may still break before its "@" on a narrow phone.
 * Each link slides up into place from behind the foot of its own line, one after the other (Maxwell,
 * 2026-11-19): `.slide-row` and `.slide-up` in globals.css. On the first screen that happens on load; a row
 * further down waits until it is scrolled to (the runtime's data-enter). Reduced motion: they are just there.
 */
export async function ContactLinks() {
  const t = await getTranslations('contact');
  const [user, domain] = EMAIL.split('@');
  const rows = [
    { label: t('emailLabel'), href: `mailto:${EMAIL}`, parts: [user, `@${domain}`] },
    { label: t('instagramLabel'), href: INSTAGRAM_URL, parts: [INSTAGRAM_HANDLE] },
    { label: t('facebookLabel'), href: FACEBOOK_URL, parts: [FACEBOOK_LABEL] },
  ];
  // One size for all three: the longest must fit the link's column (10 of 12 from 1024, the full width below).
  const longest = rows.map((r) => r.parts.join('')).reduce((a, b) => (b.length > a.length ? b : a));
  const size = fit(longest, 0.5 * 1.2, '1.25rem', 'var(--fs-quote)');

  let n = 0;
  return (
    <ul role="list">
      {rows.map(({ label, href, parts }, i) => (
        <li key={href} data-enter className={`slide-row ${i ? 'mt-6 lg:mt-8' : ''}`}>
          {i > 0 && <Hairline />}
          <div className={`grid items-baseline gap-x-gap lg:grid-cols-12 ${i ? 'pt-4 lg:pt-6' : ''}`}>
            <span className={`${LABEL} lg:col-span-2`}>{label}</span>
            <AnyLink
              href={href}
              className={`${LINK} mt-1 inline-flex min-h-11 flex-wrap items-center justify-self-start text-quote lg:col-span-10 lg:mt-0`}
              style={{ fontSize: size }}
            >
              {parts.map((part) => (
                <span key={part} className="slide-up" style={{ '--i': n++ } as CSSProperties}>
                  <span>{part}</span>
                </span>
              ))}
            </AnyLink>
          </div>
        </li>
      ))}
    </ul>
  );
}
