import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { securityHeaders } from "@/lib/securityHeaders";

export function middleware(request: NextRequest) {
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
