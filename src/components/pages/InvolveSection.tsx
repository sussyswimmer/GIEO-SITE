import type { ReactNode } from 'react';
import { Grid, Hairline, Heading, Prose, Todo } from '@/components/ui';

type InvolveSectionProps = {
  /** Also the article id and the Todo tag; H8 links to these anchors. */
  slug: string;
  title: string;
  body: string;
  children?: ReactNode;
};

/**
 * One way to get involved. An empty body is a TODO (volunteer, donate): the whole article is
 * not rendered, and in dev only the marker shows. No donate CTA exists until GIEO answers.
 */
export function InvolveSection({ slug, title, body, children }: InvolveSectionProps) {
  if (!body) return <Todo tag={slug} block />;

  return (
    <article id={slug}>
      <Hairline />
      <Grid className="py-12 lg:py-16">
        <Heading level="h3" as="h2" className="col-span-4 md:col-span-8 lg:col-span-4 lg:row-start-1">
          {title}
        </Heading>
        <Prose variant="lead" className="col-span-4 mt-4 md:col-span-7 lg:col-span-6 lg:col-start-6 lg:row-start-1 lg:mt-0 3xl:col-end-11">
          {body}
        </Prose>
        {children && (
          <div className="col-span-4 mt-6 flex flex-col items-start gap-4 md:col-span-7 lg:col-span-6 lg:col-start-6 lg:row-start-2 lg:mt-8">
            {children}
          </div>
        )}
      </Grid>
    </article>
  );
}
