import { db } from "@/lib/db";
import { scrubSensitiveText, stableFingerprint } from "@/lib/triage";

type SupportTicketForTriage = {
  id: string;
  created_at: string;
  updated_at?: string;
  subject: string | null;
  description: string;
  priority: "low" | "medium" | "high";
  category: "bug" | "feedback" | "billing" | "other";
  metadata: Record<string, unknown> | null;
};

function inferSeverity(priority: "low" | "medium" | "high") {
  if (priority === "high") return "high" as const;
  if (priority === "medium") return "medium" as const;
  return "low" as const;
}

export async function upsertTriageFromSupportTicket(ticket: SupportTicketForTriage, actorId: string | null = null) {
  const correlationId = typeof ticket.metadata?.correlation_id === "string" ? ticket.metadata.correlation_id : "";
  const title = scrubSensitiveText(ticket.subject?.trim() || "Support ticket report", 200);
  const summary = scrubSensitiveText(ticket.description, 4000);
  const fingerprint = stableFingerprint(`support-${ticket.category}:${correlationId || ticket.id}:${title}:${summary.slice(0, 240)}`);
  const now = new Date().toISOString();

  const existing = await db
    .from("triage_items")
    .select("id")
    .eq("source", "internal")
    .eq("source_event_id", ticket.id)
    .maybeSingle();

  const payload = {
    source: "internal",
    source_event_id: ticket.id,
    source_link: null,
    fingerprint,
    title,
    summary,
    severity: inferSeverity(ticket.priority),
    environment: "support_report",
    release_version: typeof ticket.metadata?.app_version === "string" ? scrubSensitiveText(ticket.metadata.app_version, 120) : null,
    first_seen_at: ticket.created_at || now,
    last_seen_at: ticket.updated_at || now,
    evidence: [
      {
        source: "support_ticket",
        ref: ticket.id,
        excerpt: summary.slice(0, 500),
        observedAt: ticket.created_at || now
      }
    ],
    metadata: {
      support_ticket_id: ticket.id,
      support_category: ticket.category,
      correlation_id: correlationId || null,
      last_route: typeof ticket.metadata?.last_route === "string" ? scrubSensitiveText(ticket.metadata.last_route, 200) : null,
      browser_os: typeof ticket.metadata?.browser_os === "string" ? scrubSensitiveText(ticket.metadata.browser_os, 120) : null,
      synced_from: "support_tickets"
    },
    ingested_by: actorId || "system",
    updated_at: now
  };

  if (existing.error) {
    throw new Error(`Could not query existing triage item: ${existing.error.message}`);
  }

  if (existing.data?.id) {
    const { error } = await db.from("triage_items").update(payload).eq("id", existing.data.id);
    if (error) {
      throw new Error(`Could not update triage item: ${error.message}`);
    }
    return { inserted: 0, updated: 1 } as const;
  }

  const { error } = await db.from("triage_items").insert(payload);
  if (error) {
    throw new Error(`Could not insert triage item: ${error.message}`);
  }

  return { inserted: 1, updated: 0 } as const;
}
