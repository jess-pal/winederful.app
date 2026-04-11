import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRequestFingerprint } from "@/lib/security";
import { trackEvent } from "@/lib/analytics";
import { trackProductEvent } from "@/lib/productEvents";
import { shareTrackSchema } from "@/lib/zodSchemas";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = shareTrackSchema.safeParse(body);

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
    sessionId: parsed.data.sessionId,
    metadata: { page: "/results", share_path: parsed.data.sharePath, platform: parsed.data.platform },
    ipHash
  });
  await trackProductEvent({
    eventName: parsed.data.platform === "copy" ? "share_copied" : "share_clicked",
    sessionId: parsed.data.sessionId,
    route: "/results",
    metadata: { sharePath: parsed.data.sharePath, platform: parsed.data.platform }
  });

  return NextResponse.json({ ok: true });
}
