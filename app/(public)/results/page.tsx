"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ResultCard } from "@/components/Results/ResultCard";
import { SharePanel } from "@/components/Results/SharePanel";

type ResultPayload = {
  personaId: string;
  title: string;
  description: string;
  recommendedStyles: [string, string, string];
  explanationBullets: string[];
};

export default function ResultsPage() {
  return (
    <Suspense fallback={<ResultsFallback />}>
      <ResultsContent />
    </Suspense>
  );
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const sid = searchParams.get("sid");
  const safeToken = token && /^[A-Za-z0-9_-]{10,128}$/.test(token) ? token : null;
  const safeSessionId = sid && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sid) ? sid : undefined;

  const result = useMemo<ResultPayload | null>(() => {
    const raw = sessionStorage.getItem("wine-persona-last-result");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ResultPayload;
    } catch {
      return null;
    }
  }, []);

  if (!result || !safeToken) {
    return (
      <main className="py-12">
        <Container className="max-w-2xl">
          <p>Could not load your result. Please retake the quiz.</p>
          <a className="mt-3 inline-flex rounded-xl bg-brand-700 px-4 py-2 text-white" href="/quiz">
            Go to quiz
          </a>
        </Container>
      </main>
    );
  }

  const sharePath = `/share/${safeToken}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  return (
    <main className="py-10 sm:py-14">
      <Container className="max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <ResultCard result={result} />
          <SharePanel sharePath={sharePath} siteUrl={siteUrl} title={result.title} sessionId={safeSessionId} />
        </div>
      </Container>
    </main>
  );
}

function ResultsFallback() {
  return (
    <main className="py-12">
      <Container className="max-w-2xl">
        <p>Loading your result...</p>
      </Container>
    </main>
  );
}
