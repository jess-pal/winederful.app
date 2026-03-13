import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { scrubSensitiveText, stableFingerprint } from "@/lib/triage";

function sentryLevelToSeverity(level: string): "low" | "medium" | "high" | "critical" {
  const normalized = level.toLowerCase();
  if (normalized === "fatal") return "critical";
  if (normalized === "error") return "high";
  if (normalized === "warning") return "medium";
  return "low";
}

function isIgnoredSentryRecord(record: Record<string, unknown>) {
  const title = typeof record.title === "string" ? record.title.toLowerCase() : "";
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
  const culprit = typeof record.culprit === "string" ? record.culprit.toLowerCase() : "";
  const permalink = typeof record.permalink === "string" ? record.permalink.toLowerCase() : "";
  const transaction = typeof record.transaction === "string" ? record.transaction.toLowerCase() : "";

  if (title.includes("manual sentry test from admin route")) return true;
  if (message.includes("manual sentry test from admin route")) return true;
  if (culprit.includes("/api/debug/sentry-test")) return true;
  if (permalink.includes("sentry-test")) return true;
  if (transaction.includes("/api/debug/sentry-test")) return true;
  return false;
}

export function sentrySyncConfigured() {
  return Boolean(env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG_SLUG && env.SENTRY_PROJECT_SLUG);
}

export async function syncSentryTriage(options: { limit?: number; actorId?: string | null } = {}) {
  if (!sentrySyncConfigured()) {
    return {
      inserted: 0,
      updated: 0,
      fetched: 0,
      configured: false
    };
  }

  const orgSlug = env.SENTRY_ORG_SLUG as string;
  const projectSlug = env.SENTRY_PROJECT_SLUG as string;
  const authToken = env.SENTRY_AUTH_TOKEN as string;

  const limit = Math.min(Math.max(options.limit || 20, 1), 100);
  const sentryUrl = `https://sentry.io/api/0/projects/${encodeURIComponent(orgSlug)}/${encodeURIComponent(projectSlug)}/events/?query=is:unresolved&statsPeriod=24h&per_page=${limit}`;

  const sentryRes = await fetch(sentryUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${authToken}`,
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!sentryRes.ok) {
    throw new Error("Could not fetch Sentry events");
  }

  const payload = (await sentryRes.json()) as unknown;
  const events = Array.isArray(payload) ? payload : [];

  let inserted = 0;
  let updated = 0;

  for (const item of events) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (isIgnoredSentryRecord(record)) continue;

    const eventId = typeof record.eventID === "string" ? record.eventID : undefined;
    const title = scrubSensitiveText(typeof record.title === "string" ? record.title : "Sentry runtime error", 200);
    const message = scrubSensitiveText(
      typeof record.message === "string" ? record.message : typeof record.culprit === "string" ? record.culprit : "No summary provided",
      4000
    );
    const level = typeof record.level === "string" ? record.level : "error";
    const environment = typeof record.environment === "string" ? record.environment : null;
    const releaseVersion = typeof record.release === "string" ? record.release : null;
    const permalink = typeof record.permalink === "string" ? record.permalink : null;
    const firstSeenAt = typeof record.dateCreated === "string" ? record.dateCreated : new Date().toISOString();

    const fingerprintSource = `${title}:${message}:${String(record.groupID || eventId || "")}`;
    const fingerprint = stableFingerprint(fingerprintSource);

    const evidence = [
      {
        source: "sentry",
        ref: eventId || `sentry-${fingerprint.slice(0, 12)}`,
        excerpt: message.slice(0, 500),
        observedAt: firstSeenAt
      }
    ];

    const existing = eventId
      ? await db
          .from("triage_items")
          .select("id, occurrence_count")
          .eq("source", "sentry")
          .eq("source_event_id", eventId)
          .maybeSingle()
      : { data: null, error: null };

    if (existing.error) continue;

    if (existing.data) {
      const { error: updateError } = await db
        .from("triage_items")
        .update({
          updated_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          occurrence_count: existing.data.occurrence_count + 1,
          title,
          summary: message,
          severity: sentryLevelToSeverity(level),
          environment,
          release_version: releaseVersion,
          source_link: permalink,
          evidence
        })
        .eq("id", existing.data.id);

      if (!updateError) updated += 1;
      continue;
    }

    const { error: insertError } = await db.from("triage_items").insert({
      source: "sentry",
      source_event_id: eventId || null,
      source_link: permalink,
      fingerprint,
      title,
      summary: message,
      severity: sentryLevelToSeverity(level),
      environment,
      release_version: releaseVersion,
      first_seen_at: firstSeenAt,
      last_seen_at: new Date().toISOString(),
      evidence,
      metadata: {
        raw_level: level
      },
      ingested_by: options.actorId || "system"
    });

    if (!insertError) inserted += 1;
  }

  return {
    inserted,
    updated,
    fetched: events.length,
    configured: true
  };
}
