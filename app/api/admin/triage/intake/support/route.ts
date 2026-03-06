import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { trackSecurityEvent } from "@/lib/securityAlerts";
import { upsertTriageFromSupportTicket } from "@/lib/triageSupportSync";

export async function POST(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_support_ticket_intake_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_support_ticket_intake:${admin.user.id}`, 20, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/triage/intake/support" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const { data, error } = await db
    .from("support_tickets")
    .select("id, created_at, updated_at, subject, description, priority, category, metadata")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return NextResponse.json({ error: "Could not load support bug tickets" }, { status: 500 });
  }

  let inserted = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const ticket of data || []) {
    try {
      const result = await upsertTriageFromSupportTicket(
        {
          id: ticket.id,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          subject: ticket.subject,
          description: ticket.description,
          priority: ticket.priority,
          category: ticket.category,
          metadata: (ticket.metadata || {}) as Record<string, unknown>
        },
        admin.user.id
      );
      inserted += result.inserted;
      updated += result.updated;
    } catch (error) {
      // Continue syncing other tickets.
      failed += 1;
      if (errors.length < 5) {
        errors.push(error instanceof Error ? error.message : "unknown error");
      }
    }
  }

  await db.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: admin.user.id,
    action: "triage_support_ticket_sync",
    target_type: "triage_item",
    target_id: null,
    metadata: {
      inserted,
      updated,
      failed,
      scanned: (data || []).length,
      errors
    }
  });

  return NextResponse.json({ inserted, updated, failed, scanned: (data || []).length, errors });
}
