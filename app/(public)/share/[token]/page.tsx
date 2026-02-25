import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";

type ShareData = {
  title: string;
  description: string;
  recommendedStyles: [string, string, string];
  explanationBullets: string[];
};

async function resolveShare(token: string): Promise<ShareData | null> {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/share/resolve`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
    cache: "no-store"
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.result || null;
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const result = await resolveShare(token);

  if (!result) {
    return { title: "Wine Persona" };
  }

  return {
    title: `${result.title} | Wine Persona`,
    description: result.description,
    openGraph: {
      title: `${result.title} | Wine Persona`,
      description: result.description,
      type: "website"
    }
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await resolveShare(token);

  if (!result) {
    notFound();
  }

  return (
    <main className="py-12">
      <Container className="max-w-3xl">
        <Card className="space-y-5">
          <p className="text-sm uppercase tracking-wide text-brand-700">Shared Wine Persona</p>
          <h1 className="text-4xl">{result.title}</h1>
          <p className="text-slate-700">{result.description}</p>
          <ul className="list-disc space-y-1 pl-6 text-slate-700">
            {result.recommendedStyles.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <ul className="list-disc space-y-1 pl-6 text-slate-700">
            {result.explanationBullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <a className="inline-flex rounded-xl bg-brand-700 px-4 py-2 text-white" href="/quiz">
            Take your own quiz
          </a>
        </Card>
      </Container>
    </main>
  );
}
