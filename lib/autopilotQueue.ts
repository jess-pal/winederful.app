import { db } from "@/lib/db";
import { buildProposalOutput } from "@/lib/triage";
import { triageProposalOutputSchema } from "@/lib/zodSchemas";
import { classifyProposalRisk } from "@/lib/autopilotPolicy";
import { sendAutopilotApprovalEmail } from "@/lib/autopilotNotifications";

export async function buildAutopilotQueue(options: { limit?: number; actorId?: string | null } = {}) {
  const limit = Math.min(Math.max(options.limit || 40, 1), 200);

  const triageRes = await db
    .from("triage_items")
    .select("id, source, title, summary, severity, environment, release_version, fingerprint, evidence, metadata")
    .in("status", ["open", "triaged"])
    .order("last_seen_at", { ascending: false })
    .limit(limit);

  if (triageRes.error) {
    throw new Error(`Could not load triage items for autopilot queue: ${triageRes.error.message}`);
  }

  const queueRes = await db.from("triage_autopilot_queue").select("triage_item_id, status");
  if (queueRes.error) {
    throw new Error(`Could not load autopilot queue rows: ${queueRes.error.message}`);
  }

  const existingMap = new Map<string, string>();
  for (const item of queueRes.data || []) {
    existingMap.set(item.triage_item_id, item.status);
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let invalid = 0;
  const insertedForApprovalEmail: Array<{
    queueId: string;
    triageItemId: string;
    title: string;
    summary: string;
    severity: "low" | "medium" | "high" | "critical";
    riskClass: "low" | "medium" | "high";
    proposal: {
      plainLanguageFix: string;
      nextActions: string[];
    };
  }> = [];

  for (const item of triageRes.data || []) {
    const relatedRes = await db
      .from("triage_items")
      .select("id")
      .eq("fingerprint", item.fingerprint)
      .order("last_seen_at", { ascending: false })
      .limit(12);

    const relatedIds = (relatedRes.data || []).map((r) => r.id);
    const proposalRaw = buildProposalOutput(
      item as {
        id: string;
        source: "sentry" | "internal";
        title: string;
        summary: string;
        severity: "low" | "medium" | "high" | "critical";
        environment: string | null;
        release_version: string | null;
        fingerprint: string;
        evidence: unknown;
        metadata?: unknown;
      },
      relatedIds
    );

    const proposal = triageProposalOutputSchema.safeParse(proposalRaw);
    if (!proposal.success) {
      invalid += 1;
      continue;
    }

    const riskClass = classifyProposalRisk({
      severity: item.severity,
      issueType: proposal.data.proposal.issueType,
      confidence: proposal.data.proposal.confidence
    });

    const currentStatus = existingMap.get(item.id);
    if (!currentStatus) {
      const { data: insertedQueue, error } = await db
        .from("triage_autopilot_queue")
        .insert({
          triage_item_id: item.id,
          status: "pending",
          risk_class: riskClass,
          proposal_payload: proposal.data,
          decision_note: null,
          decided_by: null,
          decided_at: null,
          updated_at: new Date().toISOString()
        })
        .select("id")
        .single();
      if (!error && insertedQueue) {
        inserted += 1;
        insertedForApprovalEmail.push({
          queueId: insertedQueue.id,
          triageItemId: item.id,
          title: item.title,
          summary: item.summary,
          severity: item.severity,
          riskClass,
          proposal: {
            plainLanguageFix: proposal.data.proposal.plainLanguage.recommendedFix,
            nextActions: proposal.data.proposal.nextActions
          }
        });
      }
      continue;
    }

    if (["pending", "approved"].includes(currentStatus)) {
      const { error } = await db
        .from("triage_autopilot_queue")
        .update({
          proposal_payload: proposal.data,
          risk_class: riskClass,
          updated_at: new Date().toISOString()
        })
        .eq("triage_item_id", item.id);
      if (!error) updated += 1;
    } else {
      skipped += 1;
    }
  }

  await db.from("audit_logs").insert({
    actor_type: options.actorId ? "admin" : "system",
    actor_id: options.actorId || null,
    action: "triage_autopilot_queue_built",
    target_type: "triage_autopilot_queue",
    target_id: null,
    metadata: {
      scanned: (triageRes.data || []).length,
      inserted,
      updated,
      skipped,
      invalid
    }
  });

  let approvalEmail: { sent: boolean; reason?: string; queueCount?: number } = { sent: false };
  if (insertedForApprovalEmail.length) {
    try {
      const emailResult = await sendAutopilotApprovalEmail(insertedForApprovalEmail, {
        actorType: options.actorId ? "admin" : "system",
        actorId: options.actorId || null
      });
      approvalEmail = {
        sent: emailResult.sent,
        reason: "reason" in emailResult ? emailResult.reason : undefined,
        queueCount: "queueCount" in emailResult ? emailResult.queueCount : undefined
      };
    } catch (error) {
      approvalEmail = {
        sent: false,
        reason: error instanceof Error ? error.message : "Approval email failed"
      };
    }
  }

  return {
    scanned: (triageRes.data || []).length,
    inserted,
    updated,
    skipped,
    invalid,
    approvalEmail
  };
}
