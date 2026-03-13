import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { trackSecurityEvent } from "@/lib/securityAlerts";
import { autopilotPrDraftRequestSchema } from "@/lib/zodSchemas";
import { createAutopilotPrDraftFromQueue } from "@/lib/autopilotPrDraft";

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_autopilot_pr_draft_denied" });
  if ("error" in admin) return NextResponse.json({ error: admin.error }, { status: admin.status });

  const limiter = checkRateLimit(`admin_autopilot_pr_draft:${admin.user.id}`, 40, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/autopilot/pr-draft" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = autopilotPrDraftRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid PR draft payload", issues: parsed.error.issues }, { status: 400 });
  }

  try {
    const result = await createAutopilotPrDraftFromQueue({
      queueId: parsed.data.queueId,
      actorId: admin.user.id,
      actorType: "admin",
      createdVia: "autopilot_pr_draft_route",
      requireApproved: true
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create PR draft issue";
    if (message === "Queue item not found") return NextResponse.json({ error: message }, { status: 404 });
    if (message.includes("must be approved") || message.includes("risk class is not low")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
