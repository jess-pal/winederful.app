import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shareResolveSchema } from "@/lib/zodSchemas";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRequestFingerprint } from "@/lib/security";
import { trackEvent } from "@/lib/analytics";

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

  const { data, error } = await db
    .from("quiz_sessions")
    .select("id, result_payload")
    .eq("public_share_token", parsed.data.token)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  await trackEvent({
    eventName: "viewed_result",
    sessionId: data.id,
    metadata: { page: "/share/[token]" },
    ipHash
  });

  return NextResponse.json({ result: data.result_payload });
}
