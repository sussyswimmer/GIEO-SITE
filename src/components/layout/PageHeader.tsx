import { Container, Grid, Heading, Prose, Section } from '@/components/ui';

/** Inner-page header (PLAN.md §3). The only <h1> on an inner page. */
export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <Section as="header" tone="cream" glow="dawn" pad="none">
      <Container className="pb-16 pt-[calc(var(--nav-offset)+var(--space-16))] lg:pb-24 lg:pt-[calc(var(--nav-offset)+var(--space-24))]">
        <Grid>
          <Heading as="h1" className="col-span-4 max-w-(--measure-heading) md:col-span-7 lg:col-span-8">
            {title}
          </Heading>
          {intro && (
            <Prose variant="lead" className="col-span-4 mt-6 md:col-span-7 lg:col-span-6 lg:mt-8">
              {intro}
            </Prose>
          )}
        </Grid>
      </Container>
    </Section>
  );
}
