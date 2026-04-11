"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QUIZ_QUESTIONS } from "@/lib/scoring/questions";
import { QUIZ_ANSWERS_STORAGE_KEY } from "@/lib/quizStorage";
import { sendClientEvent } from "@/lib/clientAnalytics";

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
  const searchParams = useSearchParams();
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
  const questionStartedAtRef = useRef<number>(0);
  const shareVisitTrackedRef = useRef(false);

  useEffect(() => {
    const from = searchParams.get("from");
    void fetch(`/api/quiz/start${from ? `?from=${encodeURIComponent(from)}` : ""}`, { method: "POST" });
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem(QUIZ_ANSWERS_STORAGE_KEY, JSON.stringify(answers));
  }, [answers]);

  const current = QUIZ_QUESTIONS[index];
  const selected = answers[current.id];
  const entrySource = searchParams.get("from") || "direct";

  useEffect(() => {
    questionStartedAtRef.current = Date.now();
    void sendClientEvent({
      eventName: "question_viewed",
      route: "/quiz",
      questionId: current.id,
      questionIndex: index + 1,
      source: entrySource,
      metadata: {
        answerSelected: false
      }
    });
  }, [current.id, entrySource, index]);

  useEffect(() => {
    if (entrySource === "share" && !shareVisitTrackedRef.current) {
      shareVisitTrackedRef.current = true;
      void sendClientEvent({
        eventName: "share_opened_from_friend",
        route: "/quiz",
        source: "share",
        metadata: {
          hasToken: Boolean(searchParams.get("token"))
        }
      });
    }
  }, [entrySource, searchParams]);

  const payload = useMemo<Answer[]>(() => {
    return QUIZ_QUESTIONS.map((q) => ({ questionId: q.id, optionId: answers[q.id] })).filter((a) => Boolean(a.optionId));
  }, [answers]);

  const onSubmit = async () => {
    if (!answers[current.id]) {
      setError("Pick one answer first, then we'll reveal your persona.");
      void sendClientEvent({
        eventName: "quiz_submit_failed",
        route: "/quiz",
        questionId: current.id,
        questionIndex: index + 1,
        source: entrySource,
        metadata: { reason: "missing_answer" }
      });
      return;
    }

    setIsSubmitting(true);
    setError(null);
    void sendClientEvent({
      eventName: "quiz_submit_attempted",
      route: "/quiz",
      questionId: current.id,
      questionIndex: index + 1,
      source: entrySource,
      metadata: {
        durationMs: Date.now() - questionStartedAtRef.current
      }
    });
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "We couldn't submit your quiz right now.");
        void sendClientEvent({
          eventName: "quiz_submit_failed",
          route: "/quiz",
          questionId: current.id,
          questionIndex: index + 1,
          source: entrySource,
          metadata: { reason: data.error || "submit_failed" }
        });
        setIsSubmitting(false);
        return;
      }

      localStorage.removeItem(QUIZ_ANSWERS_STORAGE_KEY);
      sessionStorage.setItem("wine-persona-last-result", JSON.stringify(data.result));
      router.push(`/results?sid=${encodeURIComponent(data.sessionId)}&token=${encodeURIComponent(data.shareToken)}`);
    } catch {
      setError("We hit a network wobble while saving. Please try again.");
      void sendClientEvent({
        eventName: "quiz_submit_failed",
        route: "/quiz",
        questionId: current.id,
        questionIndex: index + 1,
        source: entrySource,
        metadata: { reason: "network_error" }
      });
      setIsSubmitting(false);
    }
  };

  const onNext = () => {
    if (!answers[current.id]) {
      setError("Choose an option first, then hit next.");
      return;
    }

    setError(null);
    void sendClientEvent({
      eventName: "question_advanced",
      route: "/quiz",
      questionId: current.id,
      questionIndex: index + 1,
      source: entrySource,
      metadata: {
        durationMs: Date.now() - questionStartedAtRef.current,
        selectedOptionId: answers[current.id]
      }
    });
    setIndex((v) => Math.min(v + 1, QUIZ_QUESTIONS.length - 1));
  };

  const onSelectOption = (optionId: string) => {
    const previousOptionId = answers[current.id];
    setAnswers((prev) => ({ ...prev, [current.id]: optionId }));
    setError(null);
    void sendClientEvent({
      eventName: previousOptionId && previousOptionId !== optionId ? "answer_changed" : "answer_selected",
      route: "/quiz",
      questionId: current.id,
      questionIndex: index + 1,
      source: entrySource,
      metadata: {
        optionId,
        previousOptionId: previousOptionId || null
      }
    });
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
          <p className="text-sm text-[#F2EEE6]">Choose one option to unlock your result.</p>
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={() => {
              void sendClientEvent({
                eventName: "question_back_clicked",
                route: "/quiz",
                questionId: current.id,
                questionIndex: index + 1,
                source: entrySource,
                metadata: {
                  durationMs: Date.now() - questionStartedAtRef.current
                }
              });
              setIndex((v) => Math.max(v - 1, 0));
            }}
            disabled={index === 0 || isSubmitting}
            className="min-w-28"
          >
            Back
          </Button>

          {index < QUIZ_QUESTIONS.length - 1 ? (
            <Button onClick={onNext} disabled={isSubmitting} className="min-w-28">
              Next
            </Button>
          ) : (
            <Button onClick={onSubmit} disabled={isSubmitting} className="min-w-40">
              {isSubmitting ? "Mixing your result..." : "Reveal my persona"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
