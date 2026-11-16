import { useTranslations } from 'next-intl';

/** First focusable element on every page. Hidden until focused, then a plum pill top-left. */
export function SkipLink() {
  const t = useTranslations('nav');
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:top-(--nav-top) focus:left-(--gutter) focus:z-(--z-skip) focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-pill focus:bg-plum-ink focus:px-6 focus:text-ui focus:font-medium focus:text-cream"
    >
      {t('skipToContent')}
    </a>
  );
}
