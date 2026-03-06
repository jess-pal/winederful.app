import crypto from "node:crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

type CounterBucket = {
  count: number;
  resetAt: number;
};

const eventCounters = new Map<string, CounterBucket>();

function requestHashes(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") || "0.0.0.0").split(",")[0].trim();
  const ua = request.headers.get("user-agent") || "unknown";

  const ipHash = crypto.createHmac("sha256", env.IP_HASH_SALT).update(ip).digest("hex");
  const uaHash = crypto.createHmac("sha256", env.IP_HASH_SALT).update(ua).digest("hex");
  return { ipHash, uaHash };
}

export async function trackSecurityEvent(
  eventName: string,
  request: Request,
  details: Record<string, unknown> = {},
  options: { threshold?: number; windowMs?: number } = {}
) {
  const threshold = options.threshold ?? 5;
  const windowMs = options.windowMs ?? 10 * 60_000;
  const now = Date.now();
  const { ipHash, uaHash } = requestHashes(request);
  const counterKey = `${eventName}:${ipHash}`;

  const current = eventCounters.get(counterKey);
  if (!current || now > current.resetAt) {
    eventCounters.set(counterKey, { count: 1, resetAt: now + windowMs });
    return;
  }

  current.count += 1;
  eventCounters.set(counterKey, current);

  if (current.count < threshold) {
    return;
  }

  log("warn", "security_event_threshold_reached", {
    eventName,
    count: current.count,
    ipHash,
    uaHash,
    details
  });

  await db.from("audit_logs").insert({
    actor_type: "system",
    actor_id: null,
    action: `security:${eventName}`,
    target_type: "security_event",
    target_id: ipHash,
    metadata: {
      count: current.count,
      ip_hash: ipHash,
      ua_hash: uaHash,
      details
    }
  });
}
