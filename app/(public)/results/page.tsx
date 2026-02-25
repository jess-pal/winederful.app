"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ResultCard } from "@/components/Results/ResultCard";

type ResultPayload = {
  personaId: string;
  title: string;
  description: string;
  recommendedStyles: [string, string, string];
  explanationBullets: string[];
};

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const sid = searchParams.get("sid");

  const result = useMemo<ResultPayload | null>(() => {
    const raw = sessionStorage.getItem("wine-persona-last-result");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as ResultPayload;
    } catch {
      return null;
    }
  }, []);

  if (!result || !token || !sid) {
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

  const shareUrl = `/share/${token}`;

  return (
    <main className="py-12">
      <Container className="max-w-3xl">
        <ResultCard result={result} shareUrl={shareUrl} />
      </Container>
    </main>
  );
}
