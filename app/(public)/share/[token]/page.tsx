import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { resolveSharedResult } from "@/lib/share";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const shared = await resolveSharedResult(token);
  const result = shared?.result;

  if (!result) {
    return { title: "Wine Persona" };
  }

  return {
    title: `${result.title} | Wine Persona`,
    description: result.description,
    openGraph: {
      title: `${result.title} | Wine Persona`,
      description: result.description,
      type: "website",
      images: [`/share/${token}/opengraph-image`]
    }
  };
}

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const shared = await resolveSharedResult(token);
  const result = shared?.result;

  if (!result) {
    notFound();
  }

  return (
    <main className="py-12">
      <Container className="max-w-3xl">
        <Card className="space-y-5">
          <p className="text-sm uppercase tracking-wide text-[#18D43F]">Shared Wine Persona</p>
          <h1 className="text-4xl">{result.title}</h1>
          <p className="text-[#F2EEE6]/92">{result.description}</p>
          <ul className="list-disc space-y-1 pl-6 text-[#F2EEE6]/92">
            {result.recommendedStyles.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          <ul className="list-disc space-y-1 pl-6 text-[#F2EEE6]/92">
            {result.explanationBullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
          <a className="inline-flex rounded-xl bg-[#FF2E55] px-4 py-2 text-[#F2EEE6]" href="/quiz">
            Take your own quiz
          </a>
        </Card>
      </Container>
    </main>
  );
}
