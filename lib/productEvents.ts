import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getRequestFingerprint } from "@/lib/security";
import { getRequestContextFromHeaders } from "@/lib/requestContext";
import { log } from "@/lib/logger";

export const PRODUCT_EVENT_NAMES = [
  "quiz_started",
  "question_viewed",
  "answer_selected",
  "answer_changed",
  "question_advanced",
  "question_back_clicked",
  "quiz_submit_attempted",
  "quiz_submit_failed",
  "quiz_completed",
  "result_viewed",
  "share_clicked",
  "share_copied",
  "share_opened_from_friend",
  "support_submitted",
  "feedback_prompt_viewed",
  "feedback_submitted",
  "api_error",
  "client_error",
  "runtime_error_detected"
] as const;

export type ProductEventName = (typeof PRODUCT_EVENT_NAMES)[number];

export async function trackProductEvent(params: {
  eventName: ProductEventName;
  sessionId?: string | null;
  route?: string | null;
  questionId?: string | null;
  questionIndex?: number | null;
  personaId?: string | null;
  metadata?: Record<string, unknown>;
  source?: string | null;
}) {
  try {
    const h = await headers();
    const context = getRequestContextFromHeaders(h);
    const { ipHash } = await getRequestFingerprint();

    const { error } = await db.from("product_events").insert({
      session_id: params.sessionId || null,
      event_name: params.eventName,
      route: params.route || null,
      question_id: params.questionId || null,
      question_index: params.questionIndex ?? null,
      persona_id: params.personaId || null,
      metadata: params.metadata || {},
      ip_hash: ipHash,
      country_code: context.countryCode,
      region: context.region,
      city: context.city,
      device_type: context.deviceType,
      browser: context.browser,
      os: context.os,
      referrer: context.referrer,
      source: params.source || null
    });

    if (error) {
      log("warn", "product_event_insert_failed", { eventName: params.eventName, reason: error.message });
    }
  } catch (error) {
    log("warn", "product_event_unhandled", {
      eventName: params.eventName,
      reason: error instanceof Error ? error.message : "unknown"
    });
  }
}
