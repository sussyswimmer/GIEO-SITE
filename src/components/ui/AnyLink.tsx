import type { ComponentProps } from 'react';
import { Link } from '@/i18n/navigation';

export type AnyLinkProps = Omit<ComponentProps<'a'>, 'href'> & { href: string };

const EXTERNAL = /^(https?:|mailto:|tel:)/;

/**
 * Internal paths ('/about') go through next-intl's Link, so the current locale is kept.
 * http(s), mailto and tel render a plain <a>; web links get rel="noopener noreferrer".
 * Links open in the same tab (no surprise windows, no icon needed).
 */
export function AnyLink({ href, rel, ...props }: AnyLinkProps) {
  if (EXTERNAL.test(href)) {
    const safeRel = href.startsWith('http') ? (rel ?? 'noopener noreferrer') : rel;
    return <a href={href} rel={safeRel} {...props} />;
  }
  return <Link href={href} rel={rel} {...props} />;
}
