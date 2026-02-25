import { db } from "@/lib/db";
import { log } from "@/lib/logger";

export async function trackEvent(params: {
  eventName: "started_quiz" | "completed_quiz" | "viewed_result" | "shared_result" | "email_signup";
  sessionId?: string;
  metadata?: Record<string, unknown>;
  ipHash?: string;
}) {
  const { error } = await db.from("events").insert({
    event_name: params.eventName,
    session_id: params.sessionId || null,
    metadata: params.metadata || {},
    ip_hash: params.ipHash || null
  });

  if (error) {
    log("warn", "event_insert_failed", { eventName: params.eventName, reason: error.message });
  }
}
