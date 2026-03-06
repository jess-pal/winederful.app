import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { profileUpsertSchema } from "@/lib/zodSchemas";
import { sanitizePlainText } from "@/lib/textSanitize";

export async function GET(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const limiter = checkRateLimit(`profile_get:${auth.user.id}`, 60, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { data, error } = await auth.db
    .from("profiles")
    .select("user_id, display_name, persona_id, preferences")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }

  return NextResponse.json({ profile: data || null });
}

export async function PUT(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const limiter = checkRateLimit(`profile_put:${auth.user.id}`, 20, 60_000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = profileUpsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid profile payload", issues: parsed.error.issues }, { status: 400 });
  }

  const displayName = parsed.data.displayName ? sanitizePlainText(parsed.data.displayName, 80) : null;
  const personaId = parsed.data.personaId ? sanitizePlainText(parsed.data.personaId, 80) : null;
  const favoriteStyles = (parsed.data.favoriteStyles || []).map((style) => sanitizePlainText(style, 80));

  const { data, error } = await auth.db
    .from("profiles")
    .upsert(
      {
        user_id: auth.user.id,
        display_name: displayName,
        persona_id: personaId,
        preferences: { favorite_styles: favoriteStyles },
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id" }
    )
    .select("user_id, display_name, persona_id, preferences")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save profile" }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
