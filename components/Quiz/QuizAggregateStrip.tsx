"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";

type PersonaSummary = {
  personaId: string;
  title: string;
  count: number;
  percentage: number;
};

type AggregateResponse = {
  totalAssessments: number;
  topPersonas: PersonaSummary[];
};

export function QuizAggregateStrip() {
  const [data, setData] = useState<AggregateResponse | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const res = await fetch("/api/quiz/aggregate", {
          method: "GET"
        });

        if (!res.ok) {
          throw new Error("Failed to load aggregate stats");
        }

        const body = (await res.json()) as AggregateResponse;
        if (active) {
          setData(body);
          setHasError(false);
        }
      } catch {
        if (active) {
          setHasError(true);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  if (hasError) {
    return null;
  }

  if (!data) {
    return (
      <Card className="animate-pulse">
        <div className="h-4 w-32 rounded bg-[#F2EEE6]/10" />
        <div className="mt-3 h-10 w-28 rounded bg-[#F2EEE6]/10" />
      </Card>
    );
  }

  return (
    <Card>
      <div className="grid gap-4 sm:grid-cols-[220px,1fr] sm:gap-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F2EEE6]/85">Total assessments</p>
          <p className="mt-1 text-4xl font-bold leading-none text-[#F2EEE6]">{data.totalAssessments.toLocaleString()}</p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#F2EEE6]/85">Most common personas</p>
          {data.topPersonas.length ? (
            <div className="mt-3 space-y-3">
              {data.topPersonas.map((persona) => (
                <div key={persona.personaId}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-semibold text-[#F2EEE6]">{persona.title}</span>
                    <span className="font-medium text-[#F2EEE6]/90">{persona.percentage}%</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#F2EEE6]/12">
                    <div className="h-full rounded-full bg-[#18D43F]" style={{ width: `${Math.max(4, persona.percentage)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[#F2EEE6]/88">No completed quizzes yet. Be the first one.</p>
          )}
        </div>
      </div>
    </Card>
  );
}
