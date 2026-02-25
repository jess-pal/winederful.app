"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QUIZ_QUESTIONS } from "@/lib/scoring/questions";

type Answer = { questionId: string; optionId: string };

const STORAGE_KEY = "wine-persona-answers-v1";

export function QuizClient() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, string>;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/quiz/start", { method: "POST" });
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const current = QUIZ_QUESTIONS[index];
  const selected = answers[current.id];
  const canContinue = Boolean(selected);

  const payload = useMemo<Answer[]>(() => {
    return QUIZ_QUESTIONS.map((q) => ({ questionId: q.id, optionId: answers[q.id] })).filter((a) => Boolean(a.optionId));
  }, [answers]);

  const onSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    const res = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload })
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not submit quiz.");
      setIsSubmitting(false);
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.setItem("wine-persona-last-result", JSON.stringify(data.result));
    router.push(`/results?sid=${encodeURIComponent(data.sessionId)}&token=${encodeURIComponent(data.shareToken)}`);
  };

  return (
    <Card>
      <div className="space-y-5">
        <ProgressBar max={QUIZ_QUESTIONS.length} value={index + 1} />
        <p className="text-sm text-brand-700">Question {index + 1} of 10</p>
        <h2 className="text-2xl leading-tight">{current.prompt}</h2>

        <div className="space-y-3" role="radiogroup" aria-label={current.prompt}>
          {current.options.map((option) => {
            const active = selected === option.id;
            return (
              <button
                key={option.id}
                className={`w-full rounded-xl border p-4 text-left transition ${
                  active ? "border-brand-700 bg-brand-50" : "border-gray-200 bg-white hover:border-brand-500"
                }`}
                onClick={() => setAnswers((prev) => ({ ...prev, [current.id]: option.id }))}
                role="radio"
                aria-checked={active}
                type="button"
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="ghost" onClick={() => setIndex((v) => Math.max(v - 1, 0))} disabled={index === 0 || isSubmitting}>
            Back
          </Button>

          {index < QUIZ_QUESTIONS.length - 1 ? (
            <Button onClick={() => setIndex((v) => Math.min(v + 1, QUIZ_QUESTIONS.length - 1))} disabled={!canContinue || isSubmitting}>
              Next
            </Button>
          ) : (
            <Button onClick={onSubmit} disabled={payload.length !== 10 || isSubmitting}>
              {isSubmitting ? "Calculating..." : "See my persona"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
