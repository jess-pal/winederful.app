import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { ADMIN_SESSION_COOKIE, createAdminSessionToken } from "@/lib/adminSession";
import { checkRateLimit } from "@/lib/rateLimit";
import { trackSecurityEvent } from "@/lib/securityAlerts";

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_session_create_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_session_create:${admin.user.id}`, 20, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/session:create" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const email = admin.user.email || "";
  const token = await createAdminSessionToken(admin.user.id, email);

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 20 * 60
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 0
  });
  return response;
}
