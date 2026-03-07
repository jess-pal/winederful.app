import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { trackSecurityEvent } from "@/lib/securityAlerts";

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_debug_sentry_test_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_debug_sentry_test:${admin.user.id}`, 5, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "debug/sentry-test" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const marker = `sentry-test-${Date.now()}`;
  Sentry.captureException(new Error(`Manual Sentry test from admin route: ${marker}`), {
    tags: {
      source: "manual_debug_route"
    },
    extra: {
      marker,
      admin_user_id: admin.user.id
    }
  });

  await Sentry.flush(2000);

  return NextResponse.json({
    ok: true,
    marker,
    message: "Test exception captured and flushed to Sentry. Search Sentry for this marker."
  });
}
