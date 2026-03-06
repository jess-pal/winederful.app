import { NextResponse } from "next/server";
import { shareResolveSchema } from "@/lib/zodSchemas";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRequestFingerprint } from "@/lib/security";
import { trackEvent } from "@/lib/analytics";
import { resolveSharedResult } from "@/lib/share";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = shareResolveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const { ipHash } = await getRequestFingerprint();
  const limiter = checkRateLimit(`share_resolve:${ipHash}`, 60, 60_000);

  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const shared = await resolveSharedResult(parsed.data.token);
  if (!shared) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  await trackEvent({
    eventName: "viewed_result",
    sessionId: shared.sessionId,
    metadata: { page: "/share/[token]" },
    ipHash
  });

  return NextResponse.json({ result: shared.result });
}
