import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { trackSecurityEvent } from "@/lib/securityAlerts";
import { sendLatestTriageDigestEmail } from "@/lib/triageEmailDigest";

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_triage_report_email_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_triage_report_email:${admin.user.id}`, 20, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/reports/send-email" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const result = await sendLatestTriageDigestEmail({ actorType: "admin", actorId: admin.user.id });
    return NextResponse.json(result, { status: result.sent ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send triage digest email";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
