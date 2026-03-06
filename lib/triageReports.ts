import { db } from "@/lib/db";

type TriageReport = {
  startedAt: string;
  endedAt: string;
  newItems: number;
  updatedItems: number;
  newHighSeverityOpen: number;
  openBySeverity: Record<string, number>;
  draftsCreated: number;
  resolvedItems: number;
  topRecurring: Array<{ id: string; title: string; occurrences: number; severity: string }>;
  recommendations: string[];
};

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function asCountRows(data: Array<{ severity?: string | null }> | null) {
  const out: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const item of data || []) {
    const sev = (item.severity || "medium").toLowerCase();
    if (sev in out) out[sev] += 1;
  }
  return out;
}

function buildRecommendations(report: Omit<TriageReport, "recommendations">) {
  const recommendations: string[] = [];

  if (report.newHighSeverityOpen > 0) {
    recommendations.push("Review new high-severity open items within 24 hours and assign owners.");
  }

  if (report.topRecurring.length > 0) {
    recommendations.push(`Add regression tests for recurring issue: ${report.topRecurring[0].title}.`);
  }

  if (report.draftsCreated === 0 && report.newItems > 0) {
    recommendations.push("Generate and approve issue drafts for newly ingested items to reduce triage backlog.");
  }

  if (recommendations.length === 0) {
    recommendations.push("No urgent process changes detected. Continue monitoring recurrence and close resolved items.");
  }

  return recommendations;
}

function formatSummaryMarkdown(report: TriageReport) {
  const openSev = report.openBySeverity;
  const topRecurringLines = report.topRecurring.length
    ? report.topRecurring.map((item, index) => `${index + 1}. ${item.title} (${item.occurrences} occurrences, ${item.severity})`).join("\n")
    : "None";

  const recommendationLines = report.recommendations.map((line, index) => `${index + 1}. ${line}`).join("\n");

  return [
    `Daily bug triage summary (${report.startedAt} to ${report.endedAt})`,
    "",
    `- New triage items: ${report.newItems}`,
    `- Updated triage items: ${report.updatedItems}`,
    `- Open items by severity: critical=${openSev.critical}, high=${openSev.high}, medium=${openSev.medium}, low=${openSev.low}`,
    `- New high-severity open items: ${report.newHighSeverityOpen}`,
    `- Issue drafts created: ${report.draftsCreated}`,
    `- Items moved to resolved: ${report.resolvedItems}`,
    "",
    "Top recurring issues:",
    topRecurringLines,
    "",
    "Recommended improvements:",
    recommendationLines
  ].join("\n");
}

export async function generateDailyTriageSummary(options: { actorType: "admin" | "system"; actorId?: string | null }) {
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const windowMode = options.actorType === "admin" ? "rolling_24h" : "previous_utc_day";
  const startedAt = (windowMode === "rolling_24h" ? new Date(now.getTime() - 24 * 60 * 60 * 1000) : yesterdayStart).toISOString();
  const endedAt = (windowMode === "rolling_24h" ? now : todayStart).toISOString();
  const reportDate = (windowMode === "rolling_24h" ? now : yesterdayStart).toISOString().slice(0, 10);

  const [newItemsRes, updatedItemsRes, openItemsRes, highOpenRes, draftsRes, resolvedRes, recurringRes] = await Promise.all([
    db.from("triage_items").select("id", { count: "exact", head: true }).gte("created_at", startedAt).lt("created_at", endedAt),
    db.from("triage_items").select("id", { count: "exact", head: true }).gte("updated_at", startedAt).lt("updated_at", endedAt),
    db.from("triage_items").select("severity").in("status", ["open", "triaged", "draft_ready"]),
    db
      .from("triage_items")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .in("severity", ["high", "critical"])
      .gte("created_at", startedAt)
      .lt("created_at", endedAt),
    db.from("internal_issues").select("id", { count: "exact", head: true }).gte("created_at", startedAt).lt("created_at", endedAt),
    db.from("triage_items").select("id", { count: "exact", head: true }).eq("status", "resolved").gte("updated_at", startedAt).lt("updated_at", endedAt),
    db
      .from("triage_items")
      .select("id, title, occurrence_count, severity")
      .order("occurrence_count", { ascending: false })
      .limit(5)
  ]);

  const baseReport = {
    startedAt,
    endedAt,
    newItems: newItemsRes.count || 0,
    updatedItems: updatedItemsRes.count || 0,
    newHighSeverityOpen: highOpenRes.count || 0,
    openBySeverity: asCountRows(openItemsRes.data || []),
    draftsCreated: draftsRes.count || 0,
    resolvedItems: resolvedRes.count || 0,
    topRecurring: (recurringRes.data || []).map((item) => ({
      id: item.id,
      title: item.title,
      occurrences: item.occurrence_count,
      severity: item.severity
    }))
  };

  const report: TriageReport = {
    ...baseReport,
    recommendations: buildRecommendations(baseReport)
  };

  const summaryText = formatSummaryMarkdown(report);

  const { data, error } = await db
    .from("triage_reports")
    .upsert(
      {
        report_date: reportDate,
        period_start: startedAt,
        period_end: endedAt,
        summary_text: summaryText,
        report_payload: report,
        generated_by: options.actorType,
        generated_by_id: options.actorId || null
      },
      { onConflict: "report_date" }
    )
    .select("id, report_date, period_start, period_end, summary_text, report_payload, created_at")
    .single();

  if (error || !data) {
    throw new Error("Could not save triage report");
  }

  await db.from("audit_logs").insert({
    actor_type: options.actorType,
    actor_id: options.actorId || null,
    action: "triage_daily_summary_generated",
    target_type: "triage_report",
    target_id: data.id,
    metadata: {
      report_date: data.report_date,
      period_start: startedAt,
      period_end: endedAt,
      window_mode: windowMode
    }
  });

  return data;
}
