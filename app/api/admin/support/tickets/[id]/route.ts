import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { supabaseService } from "@/lib/supabaseClient";
import { adminTicketUpdateSchema } from "@/lib/zodSchemas";
import { trackSecurityEvent } from "@/lib/securityAlerts";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser(request, { eventName: "admin_ticket_detail_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const limiter = checkRateLimit(`admin_support_ticket_get:${admin.user.id}`, 120, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/support/tickets:detail" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const [ticketRes, messagesRes, attachmentsRes] = await Promise.all([
    db.from("support_tickets").select("id, created_at, updated_at, status, priority, user_id, subject, description, category, metadata").eq("id", id).maybeSingle(),
    db.from("support_messages").select("id, created_at, sender_type, message, metadata").eq("ticket_id", id).order("created_at", { ascending: true }),
    db.from("attachments").select("id, created_at, storage_path, mime_type, size_bytes").eq("ticket_id", id).order("created_at", { ascending: true })
  ]);

  if (ticketRes.error || !ticketRes.data) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }
  if (messagesRes.error || attachmentsRes.error) {
    return NextResponse.json({ error: "Could not load ticket details" }, { status: 500 });
  }

  const attachments = attachmentsRes.data || [];
  const signedUrls = await Promise.all(
    attachments.map(async (item) => {
      const { data } = await supabaseService.storage.from("support-attachments").createSignedUrl(item.storage_path, 60 * 10);
      return {
        ...item,
        signed_url: data?.signedUrl || null
      };
    })
  );

  return NextResponse.json({
    ticket: ticketRes.data,
    messages: messagesRes.data || [],
    attachments: signedUrls
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUser(request, { eventName: "admin_ticket_update_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const { id } = await params;
  const limiter = checkRateLimit(`admin_support_ticket_patch:${admin.user.id}`, 60, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/support/tickets:update" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = adminTicketUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update payload", issues: parsed.error.issues }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.status) updateData.status = parsed.data.status;
  if (parsed.data.priority) updateData.priority = parsed.data.priority;

  const { data, error } = await db
    .from("support_tickets")
    .update(updateData)
    .eq("id", id)
    .select("id, status, priority, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Could not update ticket" }, { status: 500 });
  }

  await db.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: admin.user.id,
    action: "support_ticket_updated",
    target_type: "support_ticket",
    target_id: id,
    metadata: {
      patch: parsed.data
    }
  });

  return NextResponse.json({ ticket: data });
}
