import { createAuthenticatedDbClient, supabaseService } from "@/lib/supabaseClient";
import { env } from "@/lib/env";
import { trackSecurityEvent } from "@/lib/securityAlerts";

export function isAdminEmail(email: string, allowlist: string): boolean {
  return allowlist
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

export async function requireAuthenticatedUser(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return { error: "Missing bearer token", status: 401 as const };
  }

  const { data, error } = await supabaseService.auth.getUser(accessToken);
  if (error || !data.user) {
    return { error: "Invalid or expired session", status: 401 as const };
  }

  return {
    user: data.user,
    accessToken,
    db: createAuthenticatedDbClient(accessToken)
  };
}

export async function getOptionalAuthenticatedUser(request: Request) {
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return null;
  }

  const { data, error } = await supabaseService.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  return {
    user: data.user,
    accessToken,
    db: createAuthenticatedDbClient(accessToken)
  };
}

export async function requireAdminUser(request: Request, options?: { eventName?: string }) {
  const eventName = options?.eventName || "admin_auth_denied";
  const auth = await requireAuthenticatedUser(request);
  if ("error" in auth) {
    await trackSecurityEvent(eventName, request, { reason: auth.error });
    return auth;
  }

  const email = auth.user.email || "";
  if (!isAdminEmail(email, env.ADMIN_ALLOWLIST)) {
    await trackSecurityEvent(eventName, request, { reason: "email_not_allowlisted" });
    return { error: "Admin access required", status: 403 as const };
  }

  return auth;
}
