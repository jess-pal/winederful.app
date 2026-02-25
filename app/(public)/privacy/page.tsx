import { Container } from "@/components/ui/Container";

export default function PrivacyPage() {
  return (
    <main className="py-12">
      <Container className="max-w-3xl space-y-4">
        <h1 className="text-4xl">Privacy</h1>
        <p>We collect minimal data to provide quiz results, abuse prevention, and aggregate analytics events.</p>
        <p>No personal profile is required for the quiz. See PRIVACY.md for full policy and retention details.</p>
      </Container>
    </main>
  );
}
