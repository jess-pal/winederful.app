import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const limiter = checkRateLimit(`account_export:${auth.user.id}`, 5, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const profileRes = await auth.db
    .from("profiles")
    .select("user_id, display_name, persona_id, preferences, created_at, updated_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (profileRes.error) {
    return NextResponse.json({ error: "Could not export account data" }, { status: 500 });
  }

  return NextResponse.json({
    exported_at: new Date().toISOString(),
    schema_version: "phase2-v2",
    profile: profileRes.data || null
  });
}
