import { useTranslations } from 'next-intl';
import { Container, Grid, Hairline, Logo, Section, TextLink } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { EMAIL, FACEBOOK_LABEL, FACEBOOK_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL, NAV_LINKS } from '@/lib/site';

// Every footer line is ink or plum: it sits on the dusk glow, where ink-soft fails contrast.
const PAGE_LINK =
  'relative inline-flex min-h-11 items-center font-serif text-h3 text-plum-ink after:absolute after:inset-x-0 after:bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-lotus-pink after:transition-[scale] after:duration-(--dur-hover) after:ease-out hover:after:scale-x-100';

// Seeds falling towards the closing line, in the space above it: [left, top, drift (% of the line's
// box, read by the runtime), turn]. Each top is larger than its drift, so a seed starts below the small
// print, and they stop short of the letters: beside Vietnamese type a seed on the line reads as a tone mark.
const SEEDS = [
  ['47%', '10%', '6', '18deg'],
  ['63%', '14%', '9', '-24deg'],
  ['74%', '8%', '5', '9deg'],
  ['86%', '16%', '10', '-12deg'],
  ['95%', '12%', '7', '31deg'],
] as const;

/**
 * Site footer (PLAN.md "Footer"). Compact rows: logo and page links, contacts, the small print, then the
 * closing line. Stacked below 768.
 * TODO(logo-svg): the logo lotus draws on when the footer enters view (`draw="view"`); until GIEO's
 * SVG exists only a dev-only neutral thread proves the trigger.
 */
export function Footer() {
  const t = useTranslations();
  const line = t('home.journal.heading');
  const contacts = [
    { label: t('footer.emailLabel'), href: `mailto:${EMAIL}`, text: EMAIL },
    { label: t('footer.instagramLabel'), href: INSTAGRAM_URL, text: INSTAGRAM_HANDLE },
    { label: t('footer.facebookLabel'), href: FACEBOOK_URL, text: FACEBOOK_LABEL },
  ];

  return (
    // No `from`: the footer lives in the layout, so globals.css fades it from the tone of the
    // page's last section instead (main:has(...) + footer).
    <Section as="footer" tone="cream" glow="dusk" pad="none">
      <Container className="pt-12 pb-10">
        <Grid className="items-center">
          <div className="col-span-full md:col-span-2">
            <Logo draw="view" siteName={t('meta.siteName')} homeLabel={t('nav.home')} />
          </div>

          {/* A plain list, not a second <nav> landmark */}
          <ul
            role="list"
            className="col-span-full mt-6 grid grid-cols-2 gap-x-gap md:col-start-3 md:mt-0 md:flex md:flex-wrap md:justify-end md:gap-x-10"
          >
            {NAV_LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link href={href} className={PAGE_LINK}>
                  {t(`nav.${key}`)}
                </Link>
              </li>
            ))}
          </ul>

          <dl className="col-span-full mt-6 flex flex-wrap gap-x-10 gap-y-4 md:gap-x-16 lg:mt-10">
            {contacts.map(({ label, href, text }) => (
              <div key={href}>
                <dt className="text-caption text-ink">{label}</dt>
                <dd>
                  <TextLink href={href} className="inline-flex min-h-11 items-center text-ui">
                    {text}
                  </TextLink>
                </dd>
              </div>
            ))}
          </dl>

          <Hairline className="col-span-full mt-8" />

          {/* IB is a text mention only: no IB logo unless GIEO confirms permission (01-brand §7) */}
          <div className="col-span-full mt-6 flex flex-col gap-2 text-caption text-ink md:flex-row md:flex-wrap md:gap-x-8 lg:col-end-9">
            <p>{t('footer.supportedBy')}</p>
            <p>{t('footer.madeWith')}</p>
          </div>
          <p className="col-span-full mt-4 text-caption text-ink lg:col-start-9 lg:mt-6 lg:text-right">
            {t('footer.rights')}
          </p>

          {/* The page ends where it began: the season's line with seeds falling towards it (docs/07 §3),
              sized from its length (0.48 em a character: the Vietnamese line measures 0.46, the English 0.38) to run the content width in one line;
              never under 44 px, so on a phone it wraps. A <p>, not a heading: the Journal section already
              owns this line as its h2. */}
          <div className="relative col-span-full pt-10 lg:pt-14">
            {SEEDS.map(([left, top, drift, turn]) => (
              <span
                key={left}
                aria-hidden="true"
                data-ornament
                data-drift={drift}
                className="absolute block h-4 w-2.5 rounded-[50%_50%_50%_50%/62%_62%_38%_38%] bg-plum-ink"
                style={{ left, top, rotate: turn }}
              />
            ))}
            <p
              className="relative font-serif text-mega text-balance italic text-plum-ink"
              style={{ fontSize: `clamp(2.75rem, calc(min(100vw - 2 * var(--gutter), var(--wrap-max)) / ${line.length * 0.48}), var(--fs-mega))` }}
            >
              {line}
            </p>
          </div>
        </Grid>
      </Container>
    </Section>
  );
}
