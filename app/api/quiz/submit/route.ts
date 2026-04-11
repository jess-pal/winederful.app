import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { scoreQuiz } from "@/lib/scoring/engine";
import { quizSubmitSchema } from "@/lib/zodSchemas";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRequestFingerprint } from "@/lib/security";
import { trackEvent } from "@/lib/analytics";
import { log } from "@/lib/logger";
import { guardQuizSubmission } from "@/lib/quizAbuse";
import { trackProductEvent } from "@/lib/productEvents";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = quizSubmitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request payload", issues: parsed.error.issues }, { status: 400 });
    }

    const { ipHash, uaHash } = await getRequestFingerprint();
    const limiter = checkRateLimit(`quiz_submit:${ipHash}`, 10, 60_000);
    if (!limiter.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const guard = await guardQuizSubmission(ipHash, uaHash);
    if (!guard.allowed) {
      log("warn", "quiz_submit_blocked", {
        reason: guard.reason || "unknown",
        retry_after_ms: guard.retryAfterMs || 0
      });
      await trackProductEvent({
        eventName: "quiz_submit_failed",
        route: "/quiz",
        metadata: {
          reason: guard.reason || "unknown",
          retryAfterMs: guard.retryAfterMs || 0,
          errorClass: "guard_blocked"
        }
      });
      return NextResponse.json(
        {
          error: "Too many submissions from this network. Please wait and try again.",
          retryAfterMs: guard.retryAfterMs || undefined
        },
        { status: 429 }
      );
    }

    const result = scoreQuiz(parsed.data.answers);
    const shareToken = crypto.randomBytes(18).toString("base64url");
    await trackProductEvent({
      eventName: "quiz_submit_attempted",
      route: "/quiz",
      personaId: result.personaId,
      metadata: { answerCount: parsed.data.answers.length }
    });

    const { data, error } = await db
      .from("quiz_sessions")
      .insert({
        result_persona: result.personaId,
        result_payload: result,
        public_share_token: shareToken,
        answers_payload: parsed.data.answers.map((a) => ({ question_id: a.questionId, option_id: a.optionId })),
        ip_hash: ipHash,
        user_agent_hash: uaHash
      })
      .select("id")
      .single();

    if (error || !data) {
      log("error", "quiz_session_insert_failed", { reason: error?.message || "unknown" });
      await trackProductEvent({
        eventName: "quiz_submit_failed",
        route: "/quiz",
        personaId: result.personaId,
        metadata: {
          reason: error?.message || "unknown",
          errorClass: "session_insert_failed"
        }
      });
      return NextResponse.json({ error: "Could not save quiz session" }, { status: 500 });
    }

    await trackEvent({
      eventName: "completed_quiz",
      sessionId: data.id,
      metadata: { persona_id: result.personaId, page: "/quiz" },
      ipHash
    });
    await trackProductEvent({
      eventName: "quiz_completed",
      sessionId: data.id,
      route: "/quiz",
      personaId: result.personaId,
      metadata: { shareTokenCreated: true }
    });

    return NextResponse.json({
      sessionId: data.id,
      shareToken,
      shareUrl: `/share/${shareToken}`,
      result
    });
  } catch (error) {
    log("error", "quiz_submit_unhandled", { reason: error instanceof Error ? error.message : "unknown" });
    await trackProductEvent({
      eventName: "quiz_submit_failed",
      route: "/quiz",
      metadata: {
        reason: error instanceof Error ? error.message : "unknown",
        errorClass: "unhandled"
      }
    });
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
