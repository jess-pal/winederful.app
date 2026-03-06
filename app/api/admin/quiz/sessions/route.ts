import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rateLimit";
import { db } from "@/lib/db";
import { trackSecurityEvent } from "@/lib/securityAlerts";

const MAX_LIMIT = 200;

export async function GET(request: Request) {
  const admin = await requireAdminUser(request, { eventName: "admin_quiz_sessions_denied" });
  if ("error" in admin) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  const limiter = checkRateLimit(`admin_quiz_sessions:${admin.user.id}`, 120, 60_000);
  if (!limiter.allowed) {
    await trackSecurityEvent("admin_rate_limited", request, { route: "admin/quiz/sessions:list" });
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const url = new URL(request.url);
  const persona = url.searchParams.get("persona");
  const pageRaw = Number(url.searchParams.get("page") || "1");
  const limitRaw = Number(url.searchParams.get("limit") || "100");
  const page = Number.isFinite(pageRaw) ? Math.max(Math.floor(pageRaw), 1) : 1;
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(Math.floor(limitRaw), 1), MAX_LIMIT) : 100;
  const offset = (page - 1) * limit;
  const upperInclusive = offset + limit;

  let query = db
    .from("quiz_sessions")
    .select("id, created_at, result_persona, result_payload, answers_payload, public_share_token")
    .order("created_at", { ascending: false })
    .range(offset, upperInclusive);

  if (persona && persona !== "all") {
    query = query.eq("result_persona", persona);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Could not load quiz sessions", detail: error.message }, { status: 500 });
  }

  const rows = data || [];
  const hasMore = rows.length > limit;
  const sessions = hasMore ? rows.slice(0, limit) : rows;

  return NextResponse.json({
    sessions,
    page,
    limit,
    hasMore
  });
}
