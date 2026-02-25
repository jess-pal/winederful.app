import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRequestFingerprint } from "@/lib/security";
import { trackEvent } from "@/lib/analytics";

const shareSchema = z.object({ shareUrl: z.string().min(1).max(256) });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = shareSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid share event" }, { status: 400 });
  }

  const { ipHash } = await getRequestFingerprint();
  const limiter = checkRateLimit(`quiz_shared:${ipHash}`, 30, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  await trackEvent({
    eventName: "shared_result",
    metadata: { page: "/results", share_path: parsed.data.shareUrl },
    ipHash
  });

  return NextResponse.json({ ok: true });
}
