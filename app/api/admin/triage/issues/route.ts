import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { internalIssueDraftCreateSchema } from "@/lib/zodSchemas";
import { trackSecurityEvent } from "@/lib/securityAlerts";

function buildDraftBody(proposal: {
  summary: string;
  reproduction: string[];
  expectedBehavior: string;
  actualBehavior: string;
  impact: string;
  nextActions: string[];
  confidence: "low" | "medium" | "high";
  missingInformation: string[];
  plainLanguage: {
    problem: string;
    userImpact: string;
    recommendedFix: string;
    expectedOutcome: string;
    tradeoffs: string;
  };
}) {
  const steps = proposal.reproduction.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const actions = proposal.nextActions.map((step, index) => `${index + 1}. ${step}`).join("\n");

  return [
    "## Plain-English Summary",
    `- Problem: ${proposal.plainLanguage.problem}`,
    `- User impact: ${proposal.plainLanguage.userImpact}`,
    `- Recommended fix: ${proposal.plainLanguage.recommendedFix}`,
    `- Expected outcome: ${proposal.plainLanguage.expectedOutcome}`,
    `- Tradeoffs: ${proposal.plainLanguage.tradeoffs}`,
    "",
    "## Summary",
    proposal.summary,
    "",
    `## Confidence`,
    proposal.confidence,
    "",
    "## Reproduction",
    steps,
    "",
    "## Expected Behavior",
    proposal.expectedBehavior,
    "",
    "## Actual Behavior",
    proposal.actualBehavior,
    "",
    "## Impact",
    proposal.impact,
    "",
    "## Next Actions",
    actions,
    "",
    "## Missing Information",
    proposal.missingInformation.length ? proposal.missingInformation.map((item, index) => `${index + 1}. ${item}`).join("\n") : "None"
  ].join("\n");
}

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_issue_draft_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_triage_issue_draft:${admin.user.id}`, 40, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/issues:create" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = internalIssueDraftCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid issue draft payload", issues: parsed.error.issues }, { status: 400 });
  }

  if (parsed.data.proposal.triageItemId !== parsed.data.triageItemId) {
    return NextResponse.json({ error: "Proposal triage item mismatch" }, { status: 400 });
  }

  const triageRes = await db.from("triage_items").select("id, status").eq("id", parsed.data.triageItemId).maybeSingle();
  if (triageRes.error || !triageRes.data) {
    return NextResponse.json({ error: "Triage item not found" }, { status: 404 });
  }

  const nowIso = new Date().toISOString();

  const { data, error } = await db
    .from("internal_issues")
    .insert({
      triage_item_id: parsed.data.triageItemId,
      status: "approved",
      draft_title: parsed.data.proposal.proposal.title,
      draft_body: buildDraftBody(parsed.data.proposal.proposal),
      proposal_payload: parsed.data.proposal,
      citations: parsed.data.proposal.citations,
      approved: true,
      approved_by: admin.user.id,
      approved_at: nowIso,
      metadata: {
        approval_note: parsed.data.approval.note || null,
        created_via: "admin_triage_ui",
        human_approved: true
      }
    })
    .select("id, triage_item_id, status, draft_title, approved, approved_by, approved_at, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not create issue draft" }, { status: 500 });
  }

  await db
    .from("triage_items")
    .update({
      status: "draft_ready",
      updated_at: nowIso
    })
    .eq("id", parsed.data.triageItemId);

  await db.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: admin.user.id,
    action: "internal_issue_draft_created",
    target_type: "internal_issue",
    target_id: data.id,
    metadata: {
      triage_item_id: parsed.data.triageItemId,
      citation_count: parsed.data.proposal.citations.length,
      human_approved: true
    }
  });

  return NextResponse.json({ issueDraft: data }, { status: 201 });
}
