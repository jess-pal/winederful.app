import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { triageItemUpdateSchema } from "@/lib/zodSchemas";
import { trackSecurityEvent } from "@/lib/securityAlerts";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser(request, { eventName: "admin_triage_detail_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const limiter = checkRateLimit(`admin_triage_item_get:${admin.user.id}`, 120, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/items:detail" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const [itemRes, draftsRes] = await Promise.all([
    db
      .from("triage_items")
      .select(
        "id, created_at, updated_at, first_seen_at, last_seen_at, status, source, source_event_id, source_link, fingerprint, title, summary, severity, environment, release_version, occurrence_count, evidence, metadata"
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("internal_issues")
      .select("id, created_at, updated_at, status, draft_title, approved, approved_by, approved_at, external_issue_ref, metadata")
      .eq("triage_item_id", id)
      .order("created_at", { ascending: false })
  ]);

  if (itemRes.error || !itemRes.data) {
    return NextResponse.json({ error: "Triage item not found" }, { status: 404 });
  }
  if (draftsRes.error) {
    return NextResponse.json({ error: "Could not load triage details" }, { status: 500 });
  }

  return NextResponse.json({ item: itemRes.data, issueDrafts: draftsRes.data || [] });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser(request, { eventName: "admin_triage_update_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const limiter = checkRateLimit(`admin_triage_item_patch:${admin.user.id}`, 60, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/items:update" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = triageItemUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload", issues: parsed.error.issues }, { status: 400 });
  }

  const { data, error } = await db
    .from("triage_items")
    .update({
      status: parsed.data.status,
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .select("id, status, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Could not update triage item" }, { status: 500 });
  }

  await db.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: admin.user.id,
    action: "triage_item_updated",
    target_type: "triage_item",
    target_id: id,
    metadata: {
      patch: parsed.data
    }
  });

  return NextResponse.json({ item: data });
}
