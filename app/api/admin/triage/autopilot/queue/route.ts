import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { trackSecurityEvent } from "@/lib/securityAlerts";
import { autopilotQueueEnabled } from "@/lib/autopilotPolicy";
import { buildAutopilotQueue } from "@/lib/autopilotQueue";

export async function GET(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_autopilot_queue_list_denied" });
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const limiter = checkRateLimit(`admin_autopilot_queue_list:${admin.user.id}`, 120, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/autopilot/queue:list" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { data, error } = await db
    .from("triage_autopilot_queue")
    .select("id, created_at, updated_at, triage_item_id, status, risk_class, decision_note, decided_by, decided_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: "Could not load autopilot queue" }, { status: 500 });
  return NextResponse.json({ enabled: autopilotQueueEnabled(), queue: data || [] });
}

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_autopilot_queue_build_denied" });
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const limiter = checkRateLimit(`admin_autopilot_queue_build:${admin.user.id}`, 20, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/autopilot/queue:build" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  if (!autopilotQueueEnabled()) {
    return NextResponse.json({ skipped: true, reason: "AUTOPILOT_ENABLE_QUEUE is false" });
  }

  try {
    const result = await buildAutopilotQueue({ actorId: admin.user.id });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build autopilot queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
