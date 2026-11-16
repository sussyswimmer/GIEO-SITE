import { getTranslations } from 'next-intl/server';
import { TextLink } from '@/components/ui';
import { EMAIL, FACEBOOK_LABEL, FACEBOOK_URL, INSTAGRAM_HANDLE, INSTAGRAM_URL } from '@/lib/site';

export async function ContactLinks() {
  const t = await getTranslations('contact');
  const items = [
    { label: t('emailLabel'), href: `mailto:${EMAIL}`, text: EMAIL },
    { label: t('instagramLabel'), href: INSTAGRAM_URL, text: INSTAGRAM_HANDLE },
    { label: t('facebookLabel'), href: FACEBOOK_URL, text: FACEBOOK_LABEL },
  ];

  return (
    <dl className="flex flex-col gap-8">
      {items.map(({ label, href, text }) => (
        <div key={href}>
          <dt className="text-caption text-ink-soft">{label}</dt>
          <dd className="mt-2 break-words">
            <TextLink href={href} className="font-serif text-h3">
              {text}
            </TextLink>
          </dd>
        </div>
      ))}
    </dl>
  );
}
