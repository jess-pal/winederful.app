import { NextResponse } from "next/server";
import { isValidCronRequest } from "@/lib/cronAuth";
import { syncSentryTriage } from "@/lib/sentryTriageSync";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const auth = isValidCronRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.reason }, { status: 401 });
  }

  try {
    const result = await syncSentryTriage({ limit: 50, actorId: "system-cron" });

    await db.from("audit_logs").insert({
      actor_type: "system",
      actor_id: "system-cron",
      action: "triage_sentry_sync",
      target_type: "triage_item",
      target_id: null,
      metadata: {
        ...result,
        via: "cron"
      }
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Sentry triage sync failed" }, { status: 502 });
  }
}
