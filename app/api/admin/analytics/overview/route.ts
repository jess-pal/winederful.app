import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { trackSecurityEvent } from "@/lib/securityAlerts";
import { getOverviewMetrics } from "@/lib/productInsights";

export async function GET(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_analytics_overview_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_analytics_overview:${admin.user.id}`, 120, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/analytics/overview" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(request.url);
  const daysRaw = Number(url.searchParams.get("days") || "30");
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.floor(daysRaw), 1), 90) : 30;

  try {
    const overview = await getOverviewMetrics(days);
    return NextResponse.json({ overview, days });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not load overview analytics", detail: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
