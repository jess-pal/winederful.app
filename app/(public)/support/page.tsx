import { Container } from "@/components/ui/Container";
import { SupportForm } from "@/components/Support/SupportForm";

export default function SupportPage() {
  return (
    <main className="py-12">
      <Container className="max-w-3xl">
        <SupportForm />
      </Container>
    </main>
  );
}
