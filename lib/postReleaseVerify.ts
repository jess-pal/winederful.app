import { db } from "@/lib/db";

export async function runPostReleaseVerification(options: { actorId?: string | null } = {}) {
  const issueRes = await db
    .from("internal_issues")
    .select("id, triage_item_id, metadata")
    .eq("status", "approved")
    .not("triage_item_id", "is", null)
    .order("approved_at", { ascending: false })
    .limit(100);

  if (issueRes.error) {
    throw new Error(`Could not load internal issues for verification: ${issueRes.error.message}`);
  }

  let created = 0;
  let skipped = 0;

  for (const issue of issueRes.data || []) {
    const exists = await db
      .from("triage_verification_runs")
      .select("id")
      .eq("internal_issue_id", issue.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (exists.data) {
      skipped += 1;
      continue;
    }

    const triageRes = await db
      .from("triage_items")
      .select("id, fingerprint, occurrence_count")
      .eq("id", issue.triage_item_id)
      .maybeSingle();

    if (triageRes.error || !triageRes.data) {
      skipped += 1;
      continue;
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recurrenceRes = await db
      .from("triage_items")
      .select("id", { count: "exact", head: true })
      .eq("fingerprint", triageRes.data.fingerprint)
      .gte("last_seen_at", since);

    const afterCount = recurrenceRes.count || 0;
    const beforeCount = triageRes.data.occurrence_count || 0;
    const status = afterCount === 0 ? "improved" : afterCount > beforeCount ? "regressed" : "monitoring";

    const metadata = issue.metadata && typeof issue.metadata === "object" ? (issue.metadata as Record<string, unknown>) : {};
    const releaseRef = typeof metadata.release_ref === "string" ? metadata.release_ref : null;

    const { error } = await db.from("triage_verification_runs").insert({
      internal_issue_id: issue.id,
      triage_item_id: triageRes.data.id,
      release_ref: releaseRef,
      before_count: beforeCount,
      after_count: afterCount,
      status,
      notes: "Automated post-release verification scaffold run.",
      metadata: {
        window_hours: 24,
        actor_id: options.actorId || null
      }
    });

    if (!error) created += 1;
  }

  await db.from("audit_logs").insert({
    actor_type: options.actorId ? "admin" : "system",
    actor_id: options.actorId || null,
    action: "triage_post_release_verification_run",
    target_type: "triage_verification_runs",
    target_id: null,
    metadata: {
      scanned: (issueRes.data || []).length,
      created,
      skipped
    }
  });

  return {
    scanned: (issueRes.data || []).length,
    created,
    skipped
  };
}
