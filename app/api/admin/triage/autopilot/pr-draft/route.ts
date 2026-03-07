import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { trackSecurityEvent } from "@/lib/securityAlerts";
import { autopilotPrDraftRequestSchema } from "@/lib/zodSchemas";
import { isSafeForPrDraft } from "@/lib/autopilotPolicy";

function suggestedBranch(queueId: string, title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join("-");
  return `codex/triage-${slug || "update"}-${queueId.slice(0, 8)}`;
}

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

  const queueRes = await db
    .from("triage_autopilot_queue")
    .select("id, triage_item_id, status, risk_class, proposal_payload")
    .eq("id", parsed.data.queueId)
    .maybeSingle();

  if (queueRes.error || !queueRes.data) return NextResponse.json({ error: "Queue item not found" }, { status: 404 });
  if (queueRes.data.status !== "approved") return NextResponse.json({ error: "Queue item must be approved first" }, { status: 400 });
  if (!isSafeForPrDraft(queueRes.data.risk_class)) {
    return NextResponse.json({ error: "PR draft generation is disabled or risk class is not low" }, { status: 400 });
  }

  const proposal = queueRes.data.proposal_payload as {
    proposal?: {
      title?: string;
      nextActions?: string[];
      plainLanguage?: { recommendedFix?: string };
    };
  };

  const title = proposal.proposal?.title || "Autopilot draft";
  const branch = suggestedBranch(queueRes.data.id, title);
  const patchPlan = proposal.proposal?.nextActions || [];

  const { data: issue, error: issueError } = await db
    .from("internal_issues")
    .insert({
      triage_item_id: queueRes.data.triage_item_id,
      status: "draft",
      draft_title: `[PR Draft] ${title}`,
      draft_body: [
        "## PR Draft Stub (No Code Executed)",
        "",
        `Suggested branch: ${branch}`,
        "",
        "## Proposed patch plan",
        ...(patchPlan.length ? patchPlan.map((step, index) => `${index + 1}. ${step}`) : ["1. No steps provided"]),
        "",
        `Non-technical recommendation: ${proposal.proposal?.plainLanguage?.recommendedFix || "N/A"}`
      ].join("\n"),
      proposal_payload: queueRes.data.proposal_payload,
      citations: (queueRes.data.proposal_payload as { citations?: unknown[] }).citations || [],
      approved: true,
      approved_by: admin.user.id,
      approved_at: new Date().toISOString(),
      metadata: {
        created_via: "autopilot_pr_draft_route",
        branch,
        execute_code: false,
        human_approved: true
      }
    })
    .select("id, triage_item_id, status, draft_title, created_at")
    .single();

  if (issueError || !issue) return NextResponse.json({ error: "Could not create PR draft issue" }, { status: 500 });

  await db
    .from("triage_autopilot_queue")
    .update({ status: "draft_ready", updated_at: new Date().toISOString() })
    .eq("id", queueRes.data.id);

  await db.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: admin.user.id,
    action: "triage_autopilot_pr_draft_created",
    target_type: "internal_issue",
    target_id: issue.id,
    metadata: {
      queue_id: queueRes.data.id,
      branch,
      execute_code: false
    }
  });

  return NextResponse.json({ issueDraft: issue, branch, patchPlan }, { status: 201 });
}
