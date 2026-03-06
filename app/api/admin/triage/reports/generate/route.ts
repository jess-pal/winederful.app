import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { generateDailyTriageSummary } from "@/lib/triageReports";
import { trackSecurityEvent } from "@/lib/securityAlerts";

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_triage_report_generate_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_triage_report_generate:${admin.user.id}`, 30, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/reports/generate" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const report = await generateDailyTriageSummary({ actorType: "admin", actorId: admin.user.id });
    return NextResponse.json({ report }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not generate triage report" }, { status: 500 });
  }
}
