import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { trackSecurityEvent } from "@/lib/securityAlerts";

const STATUS_VALUES = ["open", "triaged", "draft_ready", "ignored", "resolved"];
const SEVERITY_VALUES = ["low", "medium", "high", "critical"];

export async function GET(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_triage_list_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_triage_items:${admin.user.id}`, 120, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/items:list" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const severity = url.searchParams.get("severity");

  let query = db
    .from("triage_items")
    .select(
      "id, created_at, updated_at, first_seen_at, last_seen_at, status, source, source_event_id, source_link, title, summary, severity, environment, release_version, occurrence_count"
    )
    .order("last_seen_at", { ascending: false })
    .limit(300);

  if (status && STATUS_VALUES.includes(status)) {
    query = query.eq("status", status);
  }

  if (severity && SEVERITY_VALUES.includes(severity)) {
    query = query.eq("severity", severity);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not load triage items", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}
