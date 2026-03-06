import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { triageProposalRequestSchema, triageProposalOutputSchema } from "@/lib/zodSchemas";
import { buildProposalOutput } from "@/lib/triage";
import { trackSecurityEvent } from "@/lib/securityAlerts";

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_triage_proposal_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_triage_proposal:${admin.user.id}`, 60, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/proposal" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = triageProposalRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid proposal request", issues: parsed.error.issues }, { status: 400 });
  }

  const triageRes = await db
    .from("triage_items")
    .select("id, source, title, summary, severity, environment, release_version, fingerprint, evidence, metadata")
    .eq("id", parsed.data.triageItemId)
    .maybeSingle();

  if (triageRes.error || !triageRes.data) {
    return NextResponse.json({ error: "Triage item not found" }, { status: 404 });
  }

  const relatedRes = await db
    .from("triage_items")
    .select("id")
    .eq("fingerprint", triageRes.data.fingerprint)
    .order("last_seen_at", { ascending: false })
    .limit(12);

  const relatedIds = (relatedRes.data || []).map((item) => item.id);

  const proposal = buildProposalOutput(
    triageRes.data as {
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

  const checked = triageProposalOutputSchema.safeParse(proposal);
  if (!checked.success) {
    return NextResponse.json({ error: "Could not produce valid proposal", issues: checked.error.issues }, { status: 500 });
  }

  await db.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: admin.user.id,
    action: "triage_proposal_generated",
    target_type: "triage_item",
    target_id: parsed.data.triageItemId,
    metadata: {
      citation_count: checked.data.citations.length,
      related_count: checked.data.cluster.relatedTriageItemIds.length
    }
  });

  return NextResponse.json({ proposal: checked.data });
}
