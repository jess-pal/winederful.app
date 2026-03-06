import { Container } from "@/components/ui/Container";
import { QuizClient } from "@/components/Quiz/QuizClient";
import { QuizHypeStrip } from "@/components/Quiz/QuizHypeStrip";

export default function QuizPage() {
  return (
    <main className="py-10 sm:py-14">
      <Container className="max-w-4xl">
        <div className="mb-3 flex flex-wrap gap-2">
          <span className="disco-sticker">Funk Mode</span>
          <span className="disco-sticker">Cherry + Lime</span>
        </div>
        <h1 className="mb-6 text-5xl leading-[0.95] text-[#F2EEE6] sm:text-6xl">What wine are you?</h1>
        <QuizHypeStrip />
        <QuizClient />
      </Container>
    </main>
  );
}
