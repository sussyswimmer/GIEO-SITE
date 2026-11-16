import { Container, Heading, Section } from '@/components/ui';

// Renders inside the locale layout's <main>, so no <main> here. No copy key exists for a 404 message yet.
export default function LocaleNotFound() {
  return (
    <Section tone="cream" glow="dawn">
      <Container className="pt-nav">
        <Heading as="h1">404</Heading>
      </Container>
    </Section>
  );
}
