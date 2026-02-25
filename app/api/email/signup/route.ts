import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailSignupSchema } from "@/lib/zodSchemas";
import { checkRateLimit } from "@/lib/rateLimit";
import { getRequestFingerprint } from "@/lib/security";
import { trackEvent } from "@/lib/analytics";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = emailSignupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email signup request", issues: parsed.error.issues }, { status: 400 });
  }

  const { ipHash } = await getRequestFingerprint();
  const limiter = checkRateLimit(`email_signup:${ipHash}`, 5, 60_000);

  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const normalized = parsed.data.email.trim().toLowerCase();
  const emailHash = crypto.createHmac("sha256", env.IP_HASH_SALT).update(normalized).digest("hex");

  const { error } = await db.from("email_signups").upsert(
    {
      email: normalized,
      email_hash: emailHash,
      marketing_opt_in: parsed.data.marketingOptIn,
      consent_version: parsed.data.consentVersion,
      source: parsed.data.source || null
    },
    { onConflict: "email_hash" }
  );

  if (error) {
    return NextResponse.json({ error: "Could not save email" }, { status: 500 });
  }

  await trackEvent({
    eventName: "email_signup",
    metadata: { page: "landing", source: parsed.data.source || "unknown" },
    ipHash
  });

  return NextResponse.json({ ok: true });
}
