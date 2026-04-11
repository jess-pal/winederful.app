"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function PostQuizFeedback({ sessionId, personaId }: { sessionId: string; personaId: string }) {
  const [rating, setRating] = useState<number | null>(null);
  const [feltAccurate, setFeltAccurate] = useState<boolean | null>(null);
  const [wouldShare, setWouldShare] = useState<boolean | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/quiz/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          rating: rating || undefined,
          feltAccurate: feltAccurate ?? undefined,
          wouldShare: wouldShare ?? undefined,
          feedbackText: feedbackText.trim() || undefined,
          metadata: { personaId }
        })
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Could not save feedback");
      }

      setSubmitted(true);
      setStatus("Thanks. Your feedback is in.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save feedback");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mt-6 space-y-4">
      <div>
        <h2 className="text-2xl">How did that feel?</h2>
        <p className="mt-1 text-sm text-[#F2EEE6]/85">This helps us spot weak questions, improve results, and fix rough edges before more people hit them.</p>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="space-y-2">
          <p className="text-sm font-medium">How accurate did your result feel?</p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Not really", value: 1 },
              { label: "Somewhat", value: 2 },
              { label: "Very accurate", value: 3 }
            ].map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={rating === item.value ? "primary" : "secondary"}
                onClick={() => setRating(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-medium">Did it feel accurate?</p>
            <div className="flex gap-2">
              <Button type="button" variant={feltAccurate === true ? "primary" : "secondary"} onClick={() => setFeltAccurate(true)}>
                Yes
              </Button>
              <Button type="button" variant={feltAccurate === false ? "primary" : "secondary"} onClick={() => setFeltAccurate(false)}>
                No
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Would you share this with a friend?</p>
            <div className="flex gap-2">
              <Button type="button" variant={wouldShare === true ? "primary" : "secondary"} onClick={() => setWouldShare(true)}>
                Yes
              </Button>
              <Button type="button" variant={wouldShare === false ? "primary" : "secondary"} onClick={() => setWouldShare(false)}>
                No
              </Button>
            </div>
          </div>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">Anything confusing or flat?</span>
          <textarea
            className="w-full rounded-2xl border border-[#F2EEE6]/20 bg-[#0E0E0E] px-3 py-3 text-[#F2EEE6]"
            rows={4}
            value={feedbackText}
            onChange={(event) => setFeedbackText(event.target.value)}
            placeholder="Tell us what felt off, confusing, or boring."
            maxLength={2000}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={submitting || submitted}>
            {submitted ? "Submitted" : submitting ? "Submitting..." : "Submit feedback"}
          </Button>
          {status ? <p className="text-sm text-[#F2EEE6]/85">{status}</p> : null}
        </div>
      </form>
    </Card>
  );
}
