import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRequestFingerprint } from "@/lib/security";
import { trackEvent } from "@/lib/analytics";

export async function POST() {
  const { ipHash } = await getRequestFingerprint();
  const limiter = checkRateLimit(`quiz_start:${ipHash}`, 60, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  await trackEvent({
    eventName: "started_quiz",
    metadata: { page: "/quiz" },
    ipHash
  });

  return NextResponse.json({ ok: true });
}
