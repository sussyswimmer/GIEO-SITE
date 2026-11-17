import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Bloom } from '@/components/home/Bloom';
import { Hands } from '@/components/home/Hands';
import { Involve } from '@/components/home/Involve';
import { Journal } from '@/components/home/Journal';
import { KineticBand } from '@/components/home/KineticBand';
import { Sow } from '@/components/home/Sow';
import { Thread } from '@/components/home/Thread';
import { VisionMission } from '@/components/home/VisionMission';
import { Weave } from '@/components/home/Weave';
import { RootsStage } from '@/components/motion/RootsStage';
import { alternates } from '@/lib/seo';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: { absolute: t('title') },
    description: t('description'),
    alternates: alternates(locale, '/'),
    openGraph: { title: t('title'), description: t('description') },
  };
}

// One story, top to bottom (docs/07 §3, PLAN.md §2). Each section owns its tone; the page only composes.
// The thread is absolute in <main> and comes first, so the last section stays main's last child.
export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <Thread />
      <Sow />
      <Weave />
      {/* The live seam between the two (Full tier): roots out of the hero's soil, into the weave's cloth. */}
      <RootsStage />
      <Hands />
      <Bloom />
      <KineticBand />
      <VisionMission />
      <Journal />
      <Involve />
    </>
  );
}
