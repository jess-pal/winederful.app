import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRequestFingerprint } from "@/lib/security";
import { trackProductEvent } from "@/lib/productEvents";
import { productEventTrackSchema } from "@/lib/zodSchemas";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = productEventTrackSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid product event payload" }, { status: 400 });
  }

  const { ipHash } = await getRequestFingerprint();
  const limiter = checkRateLimit(`product_event:${ipHash}`, 180, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  await trackProductEvent(parsed.data);
  return NextResponse.json({ ok: true });
}
