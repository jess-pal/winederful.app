import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmailSignup } from "@/components/Support/EmailSignup";

export default function LandingPage() {
  return (
    <main className="py-16 sm:py-22">
      <Container>
        <section className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700">
              Wine Persona Quiz
            </p>
            <h1 className="text-5xl leading-tight sm:text-6xl">Discover the wine style that fits your personality.</h1>
            <p className="max-w-xl text-lg text-slate-700">
              Answer 10 quick multiple-choice questions. Get a fun persona, clear explanation, and shareable result page.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/quiz">
                <Button>Take the quiz</Button>
              </Link>
              <Link href="#email-signup">
                <Button variant="secondary">Get weekly wine deals</Button>
              </Link>
            </div>
          </div>

          <Card>
            <h2 className="text-xl">Why people share it</h2>
            <ul className="mt-4 space-y-2 text-slate-700">
              <li>Fun result names with personality flair</li>
              <li>Three practical wine style recommendations</li>
              <li>Explainable trait-based scoring</li>
              <li>Public share link with preview metadata</li>
            </ul>
          </Card>
        </section>

        <footer className="mt-16 flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm text-slate-600">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/support">Support</Link>
        </footer>

        <EmailSignup />
      </Container>
    </main>
  );
}
