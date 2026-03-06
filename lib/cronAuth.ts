import { env } from "@/lib/env";

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const [scheme, token] = auth.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export function isValidCronRequest(request: Request) {
  const configured = env.TRIAGE_CRON_SECRET || env.CRON_SECRET || "";
  if (!configured) {
    return { ok: false as const, reason: "TRIAGE_CRON_SECRET or CRON_SECRET is not configured" };
  }

  const fromBearer = bearerToken(request);
  const fromHeader = request.headers.get("x-cron-secret");
  const candidate = fromBearer || fromHeader || "";

  if (!candidate || candidate !== configured) {
    return { ok: false as const, reason: "Invalid cron secret" };
  }

  return { ok: true as const };
}
