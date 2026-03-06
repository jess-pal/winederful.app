import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { trackSecurityEvent } from "@/lib/securityAlerts";

export async function GET(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_ticket_list_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_support_tickets:${admin.user.id}`, 120, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/support/tickets:list" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const category = url.searchParams.get("category");

  let query = db
    .from("support_tickets")
    .select("id, created_at, updated_at, status, priority, user_id, subject, description, category, metadata")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && ["open", "pending", "resolved", "closed"].includes(status)) {
    query = query.eq("status", status);
  }

  if (category && ["bug", "feedback", "billing", "other"].includes(category)) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Could not load support tickets" }, { status: 500 });
  }

  return NextResponse.json({ tickets: data || [] });
}
