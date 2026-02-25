import { Container } from "@/components/ui/Container";
import { QuizClient } from "@/components/Quiz/QuizClient";

export default function QuizPage() {
  return (
    <main className="py-12">
      <Container className="max-w-3xl">
        <h1 className="mb-6 text-4xl">What wine are you?</h1>
        <QuizClient />
      </Container>
    </main>
  );
}
