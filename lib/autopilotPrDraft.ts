import { db } from "@/lib/db";
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

type QueueProposalPayload = {
  proposal?: {
    title?: string;
    nextActions?: string[];
    plainLanguage?: { recommendedFix?: string };
  };
  citations?: unknown[];
};

type CreateDraftOptions = {
  queueId: string;
  actorId: string;
  actorType: "admin" | "system";
  createdVia: string;
  requireApproved: boolean;
};

export async function createAutopilotPrDraftFromQueue(options: CreateDraftOptions) {
  const queueRes = await db
    .from("triage_autopilot_queue")
    .select("id, triage_item_id, status, risk_class, proposal_payload")
    .eq("id", options.queueId)
    .maybeSingle();

  if (queueRes.error || !queueRes.data) {
    throw new Error("Queue item not found");
  }

  if (options.requireApproved && queueRes.data.status !== "approved") {
    throw new Error("Queue item must be approved first");
  }

  if (!isSafeForPrDraft(queueRes.data.risk_class)) {
    throw new Error("PR draft generation is disabled or risk class is not low");
  }

  const proposal = (queueRes.data.proposal_payload || {}) as QueueProposalPayload;
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
      citations: proposal.citations || [],
      approved: true,
      approved_by: options.actorId,
      approved_at: new Date().toISOString(),
      metadata: {
        created_via: options.createdVia,
        branch,
        execute_code: false,
        human_approved: true
      }
    })
    .select("id, triage_item_id, status, draft_title, created_at")
    .single();

  if (issueError || !issue) {
    throw new Error("Could not create PR draft issue");
  }

  await db
    .from("triage_autopilot_queue")
    .update({ status: "draft_ready", updated_at: new Date().toISOString() })
    .eq("id", queueRes.data.id);

  await db.from("audit_logs").insert({
    actor_type: options.actorType,
    actor_id: options.actorId,
    action: "triage_autopilot_pr_draft_created",
    target_type: "internal_issue",
    target_id: issue.id,
    metadata: {
      queue_id: queueRes.data.id,
      branch,
      execute_code: false,
      created_via: options.createdVia
    }
  });

  return {
    issueDraft: issue,
    branch,
    patchPlan
  };
}

