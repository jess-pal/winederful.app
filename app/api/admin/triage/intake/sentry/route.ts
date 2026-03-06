import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { trackSecurityEvent } from "@/lib/securityAlerts";
import { sentrySyncConfigured, syncSentryTriage } from "@/lib/sentryTriageSync";

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_sentry_intake_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_sentry_intake:${admin.user.id}`, 12, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/intake/sentry" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  if (!sentrySyncConfigured()) {
    return NextResponse.json({ error: "Sentry intake is not configured" }, { status: 400 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 20), 1), 100);
  let result: { inserted: number; updated: number; fetched: number; configured: boolean };
  try {
    result = await syncSentryTriage({ limit, actorId: admin.user.id });
  } catch {
    return NextResponse.json({ error: "Could not fetch Sentry events" }, { status: 502 });
  }

  await db.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: admin.user.id,
    action: "triage_sentry_sync",
    target_type: "triage_item",
    target_id: null,
    metadata: {
      inserted: result.inserted,
      updated: result.updated,
      fetched: result.fetched
    }
  });

  return NextResponse.json({ inserted: result.inserted, updated: result.updated, fetched: result.fetched });
}
