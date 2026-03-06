import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRequestFingerprint } from "@/lib/security";
import { triageIntakeSchema } from "@/lib/zodSchemas";
import { scrubSensitiveText, stableFingerprint } from "@/lib/triage";

function dedupeEvidence(evidence: Array<{ source: string; ref: string; excerpt: string; observedAt?: string }>) {
  const seen = new Set<string>();
  const output: Array<{ source: string; ref: string; excerpt: string; observedAt?: string }> = [];

  for (const item of evidence) {
    const key = `${item.source}|${item.ref}|${item.excerpt}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output.slice(0, 20);
}

export async function POST(request: Request) {
  const { ipHash, uaHash } = await getRequestFingerprint();
  const limiter = checkRateLimit(`triage_intake:${ipHash}`, 60, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = triageIntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid intake payload", issues: parsed.error.issues }, { status: 400 });
  }

  const intake = parsed.data;
  const safeTitle = scrubSensitiveText(intake.title, 200);
  const safeSummary = scrubSensitiveText(intake.summary, 4000);
  const safeFingerprint = stableFingerprint(intake.fingerprint || `${safeTitle}:${safeSummary}`);

  const safeEvidence = dedupeEvidence(
    (intake.evidence || []).map((item) => ({
      source: scrubSensitiveText(item.source, 40),
      ref: scrubSensitiveText(item.ref, 300),
      excerpt: scrubSensitiveText(item.excerpt, 500),
      observedAt: item.observedAt
    }))
  );

  const nowIso = new Date().toISOString();

  let existing: { id: string; occurrence_count: number; evidence: unknown } | null = null;

  if (intake.sourceEventId) {
    const res = await db
      .from("triage_items")
      .select("id, occurrence_count, evidence")
      .eq("source", intake.source)
      .eq("source_event_id", intake.sourceEventId)
      .maybeSingle();
    if (res.data) existing = res.data;
  }

  if (!existing) {
    const res = await db
      .from("triage_items")
      .select("id, occurrence_count, evidence")
      .eq("fingerprint", safeFingerprint)
      .order("last_seen_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (res.data) existing = res.data;
  }

  if (existing) {
    const priorEvidence = Array.isArray(existing.evidence)
      ? (existing.evidence as Array<{ source: string; ref: string; excerpt: string; observedAt?: string }>)
      : [];

    const { error: updateError } = await db
      .from("triage_items")
      .update({
        updated_at: nowIso,
        last_seen_at: nowIso,
        occurrence_count: existing.occurrence_count + 1,
        severity: intake.severity,
        title: safeTitle,
        summary: safeSummary,
        environment: intake.environment || null,
        release_version: intake.releaseVersion || null,
        evidence: dedupeEvidence([...priorEvidence, ...safeEvidence]),
        metadata: {
          ip_hash: ipHash,
          ua_hash: uaHash,
          ...intake.metadata
        }
      })
      .eq("id", existing.id);

    if (updateError) {
      return NextResponse.json({ error: "Could not update triage item" }, { status: 500 });
    }

    await db.from("audit_logs").insert({
      actor_type: "system",
      actor_id: null,
      action: "triage_item_ingested",
      target_type: "triage_item",
      target_id: existing.id,
      metadata: {
        source: intake.source,
        source_event_id: intake.sourceEventId || null,
        updated_existing: true
      }
    });

    return NextResponse.json({ triageItemId: existing.id, updated: true });
  }

  const firstSeenAt = intake.occurredAt || nowIso;
  const { data, error } = await db
    .from("triage_items")
    .insert({
      source: intake.source,
      source_event_id: intake.sourceEventId || null,
      source_link: intake.sourceLink || null,
      fingerprint: safeFingerprint,
      title: safeTitle,
      summary: safeSummary,
      severity: intake.severity,
      environment: intake.environment || null,
      release_version: intake.releaseVersion || null,
      first_seen_at: firstSeenAt,
      last_seen_at: nowIso,
      evidence: safeEvidence,
      metadata: {
        ip_hash: ipHash,
        ua_hash: uaHash,
        ...intake.metadata
      },
      ingested_by: "api"
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not save triage item" }, { status: 500 });
  }

  await db.from("audit_logs").insert({
    actor_type: "system",
    actor_id: null,
    action: "triage_item_ingested",
    target_type: "triage_item",
    target_id: data.id,
    metadata: {
      source: intake.source,
      source_event_id: intake.sourceEventId || null,
      updated_existing: false
    }
  });

  return NextResponse.json({ triageItemId: data.id, updated: false }, { status: 201 });
}
