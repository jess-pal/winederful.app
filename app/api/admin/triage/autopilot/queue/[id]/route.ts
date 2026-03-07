import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { trackSecurityEvent } from "@/lib/securityAlerts";
import { autopilotQueueDecisionSchema } from "@/lib/zodSchemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser(request, { eventName: "admin_autopilot_queue_decide_denied" });
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const limiter = checkRateLimit(`admin_autopilot_queue_decide:${admin.user.id}`, 60, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/autopilot/queue:decide" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = autopilotQueueDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid decision payload", issues: parsed.error.issues }, { status: 400 });
  }

  const status = parsed.data.decision === "approve" ? "approved" : "rejected";

  const { data, error } = await db
    .from("triage_autopilot_queue")
    .update({
      status,
      decision_note: parsed.data.note || null,
      decided_by: admin.user.id,
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, status, decision_note, decided_by, decided_at")
    .single();

  if (error || !data) return NextResponse.json({ error: "Could not update queue decision" }, { status: 500 });

  await db.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: admin.user.id,
    action: "triage_autopilot_queue_decided",
    target_type: "triage_autopilot_queue",
    target_id: id,
    metadata: {
      decision: parsed.data.decision
    }
  });

  return NextResponse.json({ item: data });
}
