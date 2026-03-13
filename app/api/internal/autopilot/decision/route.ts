import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyApprovalToken } from "@/lib/autopilotApproval";
import { createAutopilotPrDraftFromQueue } from "@/lib/autopilotPrDraft";

function html(status: number, title: string, body: string) {
  return new NextResponse(
    `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${title}</title></head>
  <body style="font-family:Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 16px;">
    <h2>${title}</h2>
    <p>${body}</p>
  </body>
</html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const queueId = url.searchParams.get("queueId") || "";
  const decision = url.searchParams.get("decision") === "approve" ? "approve" : url.searchParams.get("decision") === "reject" ? "reject" : null;
  const exp = Number(url.searchParams.get("exp") || "0");
  const sig = url.searchParams.get("sig") || "";
  const draft = url.searchParams.get("draft") === "1";

  if (!queueId || !decision || !exp || !sig) {
    return html(400, "Invalid approval link", "Required parameters are missing.");
  }

  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return html(401, "Approval link expired", "Please request a fresh approval email.");
  }

  const isValid = verifyApprovalToken({ queueId, decision, exp, draft }, sig);
  if (!isValid) {
    return html(401, "Invalid approval link", "Signature verification failed.");
  }

  const queueRes = await db
    .from("triage_autopilot_queue")
    .select("id, status")
    .eq("id", queueId)
    .maybeSingle();

  if (queueRes.error || !queueRes.data) {
    return html(404, "Queue item not found", "This approval item no longer exists.");
  }

  const newStatus = decision === "approve" ? "approved" : "rejected";
  await db
    .from("triage_autopilot_queue")
    .update({
      status: newStatus,
      decision_note: "Decision via signed email approval link",
      decided_by: "approval-link",
      decided_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", queueId);

  await db.from("audit_logs").insert({
    actor_type: "system",
    actor_id: "approval-link",
    action: "triage_autopilot_queue_decided",
    target_type: "triage_autopilot_queue",
    target_id: queueId,
    metadata: {
      decision,
      via: "signed_email_link"
    }
  });

  if (decision === "approve" && draft) {
    try {
      const result = await createAutopilotPrDraftFromQueue({
        queueId,
        actorId: "approval-link",
        actorType: "system",
        createdVia: "signed_email_approval",
        requireApproved: false
      });
      return html(
        200,
        "Approved",
        `Queue item approved and PR draft stub created on branch ${result.branch}.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Draft generation failed";
      return html(200, "Approved", `Queue item approved, but draft generation was skipped: ${message}`);
    }
  }

  return html(200, decision === "approve" ? "Approved" : "Rejected", `Queue item has been marked as ${newStatus}.`);
}

