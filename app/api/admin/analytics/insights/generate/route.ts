import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { trackSecurityEvent } from "@/lib/securityAlerts";
import { generateProductInsights } from "@/lib/productInsights";

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_analytics_generate_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_analytics_generate:${admin.user.id}`, 30, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/analytics/insights/generate" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const result = await generateProductInsights({ actorType: "admin", actorId: admin.user.id });
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not generate product insights", detail: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
