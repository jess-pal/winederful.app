import { db } from "@/lib/db";
import { env } from "@/lib/env";

type ReportRow = {
  id: string;
  report_date: string;
  period_start: string;
  period_end: string;
  summary_text: string;
  report_payload: {
    recommendations?: string[];
  };
};

export function triageEmailConfigured() {
  return Boolean(env.RESEND_API_KEY && env.TRIAGE_EMAIL_TO && env.TRIAGE_EMAIL_FROM);
}

export function buildDigestEmail(report: ReportRow) {
  const subject = `[WineApp] Daily bug triage summary - ${report.report_date}`;
  const preheader = `Daily bug triage update for ${report.report_date}`;

  const recommendations = report.report_payload?.recommendations || [];
  const recommendationHtml = recommendations.length
    ? `<ul>${recommendations.map((line) => `<li>${line}</li>`).join("")}</ul>`
    : "<p>No recommendations for this period.</p>";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; color: #1f2937;">
      <p style="font-size:12px;color:#6b7280;">${preheader}</p>
      <h2 style="margin-bottom:8px;">Daily Bug Triage Summary</h2>
      <p style="margin-top:0;color:#4b5563;">Period: ${report.period_start} to ${report.period_end}</p>
      <pre style="white-space:pre-wrap;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;font-size:12px;line-height:1.4;">${report.summary_text}</pre>
      <h3 style="margin-top:16px;">Recommended improvements</h3>
      ${recommendationHtml}
      <p style="font-size:12px;color:#6b7280;margin-top:16px;">Generated from /admin/triage daily report pipeline.</p>
    </div>
  `;

  const text = [
    `Daily bug triage summary (${report.report_date})`,
    `Period: ${report.period_start} to ${report.period_end}`,
    "",
    report.summary_text,
    "",
    "Recommended improvements:",
    ...(recommendations.length ? recommendations.map((line, idx) => `${idx + 1}. ${line}`) : ["None"])
  ].join("\n");

  return { subject, html, text };
}

async function latestReport() {
  const { data, error } = await db
    .from("triage_reports")
    .select("id, report_date, period_start, period_end, summary_text, report_payload")
    .order("report_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ReportRow;
}

export async function sendLatestTriageDigestEmail(options: { actorType: "system" | "admin"; actorId?: string | null }) {
  if (!triageEmailConfigured()) {
    return { sent: false, reason: "Email digest is not configured" } as const;
  }

  const report = await latestReport();
  if (!report) {
    return { sent: false, reason: "No triage report found" } as const;
  }

  const message = buildDigestEmail(report);
  const to = env.TRIAGE_EMAIL_TO as string;
  const from = env.TRIAGE_EMAIL_FROM as string;
  const apiKey = env.RESEND_API_KEY as string;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: message.subject,
      html: message.html,
      text: message.text
    }),
    cache: "no-store"
  });

  if (!res.ok) {
    const bodyText = await res.text();
    const details = bodyText.slice(0, 280);
    throw new Error(`Email provider rejected digest send (status ${res.status}): ${details || "no details"}`);
  }

  const body = (await res.json()) as { id?: string };

  await db.from("audit_logs").insert({
    actor_type: options.actorType,
    actor_id: options.actorId || null,
    action: "triage_daily_email_sent",
    target_type: "triage_report",
    target_id: report.id,
    metadata: {
      report_date: report.report_date,
      provider: "resend",
      provider_message_id: body.id || null,
      recipient_count: 1
    }
  });

  return {
    sent: true,
    reportDate: report.report_date,
    reportId: report.id,
    providerMessageId: body.id || null
  } as const;
}
