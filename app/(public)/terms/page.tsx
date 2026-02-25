import { Container } from "@/components/ui/Container";

export default function TermsPage() {
  return (
    <main className="py-12">
      <Container className="max-w-3xl space-y-4">
        <h1 className="text-4xl">Terms</h1>
        <p>Wine Persona is an informational quiz and does not provide medical, legal, or financial advice.</p>
        <p>By using this site, you agree not to abuse APIs, attempt unauthorized access, or scrape protected data.</p>
      </Container>
    </main>
  );
}
