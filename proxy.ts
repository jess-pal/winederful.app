import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/adminSession";
import { securityHeaders } from "@/lib/securityHeaders";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isAdminSupportRoute = pathname === "/admin/support" || pathname.startsWith("/admin/support/");
  const isAdminTriageRoute = pathname === "/admin/triage" || pathname.startsWith("/admin/triage/");
  const isProtectedAdminRoute = isAdminSupportRoute || isAdminTriageRoute;

  if (isProtectedAdminRoute) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    const verified = await verifyAdminSessionToken(token);
    if (!verified) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const response = NextResponse.next();

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  response.headers.set("X-Request-Path", request.nextUrl.pathname);
  return response;
}

export const config = {
  matcher: ["/:path*"]
};
