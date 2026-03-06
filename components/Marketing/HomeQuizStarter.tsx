"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { QUIZ_QUESTIONS } from "@/lib/scoring/questions";
import { QUIZ_ANSWERS_STORAGE_KEY } from "@/lib/quizStorage";

export function HomeQuizStarter() {
  const router = useRouter();
  const firstQuestion = QUIZ_QUESTIONS[0];
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const selectedOption = useMemo(
    () => firstQuestion.options.find((option) => option.id === selectedOptionId) || null,
    [firstQuestion.options, selectedOptionId]
  );

  const startQuiz = (optionId: string) => {
    const seededAnswers = {
      [firstQuestion.id]: optionId
    };

    localStorage.setItem(QUIZ_ANSWERS_STORAGE_KEY, JSON.stringify(seededAnswers));
    router.push("/quiz?from=home");
  };

  return (
    <Card className="funk-panel w-full bg-[#0E0E0E] p-5 sm:p-6">
      <div className="h-3 overflow-hidden rounded-full border border-[#18D43F]/45 bg-[#d9dbd9]">
        <div className="h-full w-[10%] rounded-full bg-[#18D43F]" />
      </div>

      <p className="mt-4 text-xl font-semibold tracking-tight text-[#F2EEE6]">Question 1 of 10</p>
      <h2 className="mt-3 text-3xl leading-tight text-[#F2EEE6]">{firstQuestion.prompt}</h2>

      <fieldset className="mt-5 grid gap-2.5" aria-label={firstQuestion.prompt}>
        {firstQuestion.options.map((option, optionIndex) => {
          const isSelected = selectedOptionId === option.id;
          return (
          <button
            key={option.id}
            type="button"
            onClick={() => setSelectedOptionId(option.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                isSelected
                  ? "border-[#18D43F] bg-[#0E0E0E] ring-2 ring-[#FF2E55]/70"
                  : "border-[#F2EEE6]/22 bg-[#0E0E0E] hover:border-[#FF2E55]"
              }`}
            >
              <div className="flex items-center gap-4">
                <span
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-bold ${
                  isSelected ? "bg-[#FF2E55] text-[#0E0E0E]" : "bg-transparent text-[#F2EEE6]"
                }`}
                >
                  {String.fromCharCode(65 + optionIndex)}
                </span>
              <span className="truncate whitespace-nowrap text-lg font-medium tracking-tight text-[#F2EEE6]">{option.label}</span>
              </div>
            </button>
          );
        })}
      </fieldset>

      <div className="mt-6 flex justify-center">
        <button
          type="button"
          onClick={() => {
            if (selectedOption) {
              startQuiz(selectedOption.id);
            }
          }}
          className="rounded-3xl bg-[#FF2E55] px-8 py-2.5 text-xl font-semibold text-[#0E0E0E] shadow-[0_10px_22px_-14px_rgba(0,0,0,0.4)] disabled:cursor-not-allowed disabled:bg-[#FF2E55] disabled:text-[#0E0E0E] disabled:opacity-100"
          disabled={!selectedOption}
        >
          Start Quiz
        </button>
      </div>
    </Card>
  );
}
