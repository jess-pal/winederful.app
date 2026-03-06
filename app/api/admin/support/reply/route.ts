import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { adminReplySchema } from "@/lib/zodSchemas";
import { sanitizePlainText } from "@/lib/textSanitize";
import { trackSecurityEvent } from "@/lib/securityAlerts";

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_ticket_reply_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_support_reply:${admin.user.id}`, 60, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/support/reply" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = adminReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reply payload", issues: parsed.error.issues }, { status: 400 });
  }

  const safeMessage = sanitizePlainText(parsed.data.message, 3000);

  const { data, error } = await db
    .from("support_messages")
    .insert({
      ticket_id: parsed.data.ticketId,
      sender_type: "admin",
      message: safeMessage,
      metadata: {
        admin_user_id: admin.user.id
      }
    })
    .select("id, created_at, sender_type, message, metadata")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not save reply" }, { status: 500 });
  }

  await db
    .from("support_tickets")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", parsed.data.ticketId);

  await db.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: admin.user.id,
    action: "support_reply_saved",
    target_type: "support_ticket",
    target_id: parsed.data.ticketId,
    metadata: {
      message_id: data.id
    }
  });

  return NextResponse.json({ message: data });
}
