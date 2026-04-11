import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { QuizClient } from "@/components/Quiz/QuizClient";
import { QuizHypeStrip } from "@/components/Quiz/QuizHypeStrip";

export default function QuizPage() {
  return (
    <main className="py-10 sm:py-14">
      <Container className="max-w-4xl">
        <h1 className="text-5xl leading-[0.95] text-[#F2EEE6] sm:text-6xl">Let&apos;s find your wine persona.</h1>
        <p className="mb-6 mt-3 max-w-2xl text-base text-[#F2EEE6]/90 sm:text-lg">
          Pick your vibe, trust your gut, and we will reveal your wine personality in 10 quick taps.
        </p>
        <QuizHypeStrip />
        <Suspense fallback={<div className="rounded-3xl border border-[#F2EEE6]/20 bg-[#0E0E0E] p-6 text-sm text-[#F2EEE6]/80">Loading quiz...</div>}>
          <QuizClient />
        </Suspense>
      </Container>
    </main>
  );
}
