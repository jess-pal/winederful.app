import crypto from "node:crypto";
import { headers } from "next/headers";
import { env } from "@/lib/env";

export async function getRequestFingerprint() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || "0.0.0.0").split(",")[0].trim();
  const ua = h.get("user-agent") || "unknown";

  const ipHash = crypto.createHmac("sha256", env.IP_HASH_SALT).update(ip).digest("hex");
  const uaHash = crypto.createHmac("sha256", env.IP_HASH_SALT).update(ua).digest("hex");

  return { ipHash, uaHash };
}
