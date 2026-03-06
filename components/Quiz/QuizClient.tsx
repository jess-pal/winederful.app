"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QUIZ_QUESTIONS } from "@/lib/scoring/questions";
import { QUIZ_ANSWERS_STORAGE_KEY } from "@/lib/quizStorage";

type Answer = { questionId: string; optionId: string };

function loadStoredAnswers(): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = localStorage.getItem(QUIZ_ANSWERS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    localStorage.removeItem(QUIZ_ANSWERS_STORAGE_KEY);
    return {};
  }
}

export function QuizClient() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(() => loadStoredAnswers());
  const [index, setIndex] = useState(() => {
    const storedAnswers = loadStoredAnswers();
    const firstUnanswered = QUIZ_QUESTIONS.findIndex((question) => !storedAnswers[question.id]);

    if (firstUnanswered === -1) {
      return QUIZ_QUESTIONS.length - 1;
    }

    return firstUnanswered;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/quiz/start", { method: "POST" });
  }, []);

  useEffect(() => {
    localStorage.setItem(QUIZ_ANSWERS_STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const current = QUIZ_QUESTIONS[index];
  const selected = answers[current.id];

  const payload = useMemo<Answer[]>(() => {
    return QUIZ_QUESTIONS.map((q) => ({ questionId: q.id, optionId: answers[q.id] })).filter((a) => Boolean(a.optionId));
  }, [answers]);

  const onSubmit = async () => {
    if (!answers[current.id]) {
      setError("Pick an answer first, then we will reveal your persona.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
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

      localStorage.removeItem(QUIZ_ANSWERS_STORAGE_KEY);
      sessionStorage.setItem("wine-persona-last-result", JSON.stringify(data.result));
      router.push(`/results?sid=${encodeURIComponent(data.sessionId)}&token=${encodeURIComponent(data.shareToken)}`);
    } catch {
      setError("Network issue while saving your quiz. Please try again.");
      setIsSubmitting(false);
    }
  };

  const onNext = () => {
    if (!answers[current.id]) {
      setError("Please select an option before continuing.");
      return;
    }

    setError(null);
    setIndex((v) => Math.min(v + 1, QUIZ_QUESTIONS.length - 1));
  };

  const onSelectOption = (optionId: string) => {
    setAnswers((prev) => ({ ...prev, [current.id]: optionId }));
    setError(null);
  };

  return (
    <Card className="fade-in-up relative overflow-hidden">
      <div className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full bg-[#18D43F]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 h-52 w-52 rounded-full bg-[#FF2E55]/25 blur-3xl" />
      <div className="relative z-10 space-y-5">
        <ProgressBar max={QUIZ_QUESTIONS.length} value={index + 1} />
        <p className="text-sm font-semibold text-[#F2EEE6]">Question {index + 1} of 10</p>
        <h2 className="text-3xl leading-tight text-[#F2EEE6] sm:text-4xl">{current.prompt}</h2>

        <fieldset className="space-y-3" aria-label={current.prompt}>
          {current.options.map((option, optionIndex) => {
            const active = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelectOption(option.id)}
                className={`group block w-full rounded-2xl border p-4 text-left transition duration-200 ${
                  active
                    ? "border-[#FF2E55] bg-[#0E0E0E] shadow-[0_12px_28px_-20px_rgba(0,0,0,0.9)] ring-2 ring-[#18D43F]/65"
                    : "border-[#F2EEE6]/25 bg-[#0E0E0E] hover:border-[#FF2E55] hover:bg-[#18D43F]/12"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      active ? "bg-[#FF2E55] text-[#0E0E0E]" : "bg-[#0E0E0E] text-[#F2EEE6] group-hover:bg-[#18D43F]"
                    }`}
                  >
                    {String.fromCharCode(65 + optionIndex)}
                  </span>
                  <span className="text-sm font-medium text-[#F2EEE6] sm:text-base">{option.label}</span>
                </div>
              </button>
            );
          })}
        </fieldset>

        {error && <p className="rounded-xl border border-[#FF2E55]/60 bg-[#2a0d15] px-3 py-2 text-sm text-[#ffd8e0]">{error}</p>}
        {index === QUIZ_QUESTIONS.length - 1 && !answers[current.id] && (
          <p className="text-sm text-[#F2EEE6]">Choose one option to unlock the persona result.</p>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="secondary" onClick={() => setIndex((v) => Math.max(v - 1, 0))} disabled={index === 0 || isSubmitting} className="min-w-28">
            Back
          </Button>

          {index < QUIZ_QUESTIONS.length - 1 ? (
            <Button onClick={onNext} disabled={isSubmitting} className="min-w-28">
              Next
            </Button>
          ) : (
            <Button onClick={onSubmit} disabled={isSubmitting} className="min-w-40">
              {isSubmitting ? "Calculating..." : "See my persona"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
