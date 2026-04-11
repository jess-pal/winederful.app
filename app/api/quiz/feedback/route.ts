import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { getRequestFingerprint } from "@/lib/security";
import { trackProductEvent } from "@/lib/productEvents";
import { quizFeedbackSchema } from "@/lib/zodSchemas";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = quizFeedbackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid feedback payload" }, { status: 400 });
  }

  const { ipHash } = await getRequestFingerprint();
  const limiter = checkRateLimit(`quiz_feedback:${ipHash}`, 30, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { error } = await db.from("quiz_feedback").insert({
    session_id: parsed.data.sessionId,
    rating: parsed.data.rating ?? null,
    feedback_text: parsed.data.feedbackText || null,
    felt_accurate: parsed.data.feltAccurate ?? null,
    would_share: parsed.data.wouldShare ?? null,
    metadata: parsed.data.metadata || {}
  });

  if (error) {
    return NextResponse.json({ error: "Could not save feedback" }, { status: 500 });
  }

  await trackProductEvent({
    eventName: "feedback_submitted",
    sessionId: parsed.data.sessionId,
    route: "/results",
    metadata: {
      rating: parsed.data.rating ?? null,
      feltAccurate: parsed.data.feltAccurate ?? null,
      wouldShare: parsed.data.wouldShare ?? null,
      hasText: Boolean(parsed.data.feedbackText?.trim())
    }
  });

  return NextResponse.json({ ok: true });
}
