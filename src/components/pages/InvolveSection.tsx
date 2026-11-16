import type { ReactNode } from 'react';
import { Grid, Hairline, Heading, Prose, Todo } from '@/components/ui';

type InvolveSectionProps = {
  /** Also the article id and the Todo tag; the home page's Involve rows link to these anchors. */
  slug: string;
  title: string;
  body: string;
  children?: ReactNode;
};

/**
 * One way to get involved, as a large index row (the home page's Involve rows with their copy beside
 * them): a stitch, the title at h2 size, then the body and its action. An empty body is a TODO
 * (volunteer, donate): the whole row is not rendered, and in dev only the marker shows. No donate CTA
 * exists until GIEO answers.
 */
export function InvolveSection({ slug, title, body, children }: InvolveSectionProps) {
  if (!body) return <Todo tag={slug} block />;

  return (
    // The first row stands on the header's own stitch.
    <article id={slug} className="[&:first-child>hr]:hidden">
      <Hairline />
      <Grid className="items-center py-8 lg:py-10">
        <Heading className="col-span-full lg:col-end-7">{title}</Heading>
        <div className="col-span-full mt-4 lg:col-start-7 lg:col-end-13 lg:mt-0">
          <Prose variant="lead">{body}</Prose>
          {children && <div className="mt-6 flex flex-col items-start gap-4">{children}</div>}
        </div>
      </Grid>
    </article>
  );
}
