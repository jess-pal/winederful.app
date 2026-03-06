import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { QuizAggregateStrip } from "@/components/Quiz/QuizAggregateStrip";
import { HomeQuizStarter } from "@/components/Marketing/HomeQuizStarter";

export default function LandingPage() {
  return (
    <main className="py-16 sm:py-22">
      <Container>
        <section className="space-y-8">
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex flex-col">
              <div className="space-y-6">
                <h1 className="text-5xl leading-tight text-[#F2EEE6] sm:text-6xl">Discover the wine style that fits your personality.</h1>
                <p className="max-w-xl text-lg text-[#F2EEE6]">
                  Answer 10 quick multiple-choice questions. Get a fun persona, clear explanation, and a seriously shareable result page.
                </p>
              </div>
              <div className="mt-8">
                <QuizAggregateStrip />
              </div>
            </div>

            <div className="flex flex-col">
              <div className="mt-auto">
                <HomeQuizStarter />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 space-y-4">
          <Card className="funk-panel">
            <h2 className="text-2xl text-[#F2EEE6]">Why People Share It</h2>
            <p className="mt-2 text-[#F2EEE6]">Because the result is dangerously postable.</p>
            <p className="mt-2 text-[#F2EEE6]">
              You get a wine persona name you will actually want to screenshot. Not &quot;Red 3A&quot;. Something with personality.
            </p>
            <p className="mt-2 text-[#F2EEE6]">
              You will also get three &quot;try this next&quot; wine styles you can order immediately. No translating required.
            </p>
            <p className="mt-2 text-[#F2EEE6]">
              The scoring makes sense. No wine diploma needed. The results page is clean, shareable, and slightly smug.
            </p>
          </Card>
          <Card className="funk-panel">
            <h2 className="text-2xl text-[#F2EEE6]">Why It Works</h2>
            <p className="mt-2 text-[#F2EEE6]">
              Most wine quizzes test what you know. This one looks at how you drink.
            </p>
            <p className="mt-2 text-[#F2EEE6]">
              What flavours you gravitate towards, how bold you are with a wine list, and whether you host with candles and jazz or crisps and chaos.
            </p>
            <p className="mt-2 text-[#F2EEE6]">
              It is playful, theatrical, and mildly cheeky. But the recommendations are genuinely solid.
            </p>
          </Card>
          <Card className="funk-panel">
            <h2 className="text-2xl text-[#F2EEE6]">How It Works</h2>
            <p className="mt-2 text-[#F2EEE6]">We do not match you to a random grape. We match you to flavour traits.</p>
            <ul className="mt-3 list-disc space-y-1 pl-6 text-[#F2EEE6]">
              <li>Sweetness tolerance</li>
              <li>Body preference (light and elegant vs bold and dramatic)</li>
              <li>Acidity comfort</li>
              <li>Tannin bravery</li>
              <li>Experimentation level</li>
              <li>Your social drinking style</li>
            </ul>
            <p className="mt-2 text-[#F2EEE6]">
              From that, we generate your wine persona with three wine styles and regional nudges, including South African picks.
            </p>
          </Card>
          <Card className="funk-panel">
            <h2 className="text-2xl text-[#F2EEE6]">What You Will Get After 10 Questions</h2>
            <ul className="mt-3 list-disc space-y-1 pl-6 text-[#F2EEE6]">
              <li>A named wine persona</li>
              <li>A short personality-style breakdown</li>
              <li>Three recommended wine styles</li>
              <li>Suggested regions (yes, South Africa makes a cameo)</li>
              <li>A shareable results page</li>
            </ul>
            <p className="mt-2 text-[#F2EEE6]">And ideally: fewer disappointing bottles and better dinner parties.</p>
          </Card>
          <Card className="funk-panel">
            <h2 className="text-2xl text-[#F2EEE6]">For Beginners and Enthusiasts</h2>
            <p className="mt-2 text-[#F2EEE6]">
              You do not need to know what tannins are, memorise French regions, or swirl dramatically and nod.
            </p>
            <p className="mt-2 text-[#F2EEE6]">
              If you are new to wine, this narrows the field. If you already love wine, this nudges you outside your usual order.
            </p>
            <p className="mt-2 text-[#F2EEE6]">No pretence. No pressure. Just better picks.</p>
          </Card>
          <Card className="funk-panel">
            <h2 className="text-2xl text-[#F2EEE6]">Gentle Disclaimer</h2>
            <p className="mt-2 text-[#F2EEE6]">
              This is not a laboratory palate test. It is a smart, personality-based guide designed to help you discover what you genuinely enjoy.
            </p>
            <p className="mt-2 text-[#F2EEE6]">Taste still wins.</p>
          </Card>
        </section>

        <footer className="mt-16 flex flex-wrap gap-4 border-t border-[#18D43F]/40 pt-6 text-sm text-[#F2EEE6]">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </footer>
      </Container>
    </main>
  );
}
