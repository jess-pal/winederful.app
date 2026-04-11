import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { trackSecurityEvent } from "@/lib/securityAlerts";
import { getInsightAnalytics } from "@/lib/productInsights";

export async function GET(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_analytics_insights_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_analytics_insights:${admin.user.id}`, 120, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/analytics/insights" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") || "25");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), 100) : 25;

  try {
    const insights = await getInsightAnalytics(limit);
    return NextResponse.json(insights);
  } catch (error) {
    return NextResponse.json(
      { error: "Could not load product insights", detail: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
