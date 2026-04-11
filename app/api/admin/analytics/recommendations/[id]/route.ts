import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { trackSecurityEvent } from "@/lib/securityAlerts";
import { updateRecommendationApproval } from "@/lib/productInsights";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser(request, { eventName: "admin_analytics_recommendation_update_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_analytics_recommendation_update:${admin.user.id}`, 60, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/analytics/recommendations:update" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;
  const note = typeof body?.note === "string" ? body.note : null;

  if (status !== "approved" && status !== "dismissed" && status !== "implemented") {
    return NextResponse.json({ error: "Invalid recommendation status" }, { status: 400 });
  }

  try {
    const params = await context.params;
    const result = await updateRecommendationApproval({
      recommendationId: params.id,
      status,
      actorId: admin.user.id,
      note
    });
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: "Could not update recommendation", detail: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
