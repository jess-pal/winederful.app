import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthenticatedUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { sanitizePlainText } from "@/lib/textSanitize";

const deleteRequestSchema = z.object({
  reason: z.string().max(200).optional()
});

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const limiter = checkRateLimit(`account_delete_request:${auth.user.id}`, 3, 24 * 60 * 60 * 1000);
  if (!limiter.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = deleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid delete request", issues: parsed.error.issues }, { status: 400 });
  }

  const { error } = await auth.db.from("data_deletion_requests").insert({
    user_id: auth.user.id,
    status: "pending",
    reason: parsed.data.reason ? sanitizePlainText(parsed.data.reason, 200) : null
  });

  if (error) {
    return NextResponse.json({ error: "Could not create delete request" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Delete request recorded. This is a scaffold; no automatic deletion runs yet." }, { status: 201 });
}
