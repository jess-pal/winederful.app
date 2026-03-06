import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { trackSecurityEvent } from "@/lib/securityAlerts";

export async function GET(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_triage_reports_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_triage_reports:${admin.user.id}`, 120, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/reports" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { data, error } = await db
    .from("triage_reports")
    .select("id, report_date, period_start, period_end, summary_text, report_payload, created_at")
    .order("report_date", { ascending: false })
    .limit(30);

  if (error) {
    return NextResponse.json({ error: "Could not load triage reports" }, { status: 500 });
  }

  return NextResponse.json({ reports: data || [] });
}
