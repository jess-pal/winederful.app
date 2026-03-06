import crypto from "node:crypto";

type TriageEvidence = {
  source: string;
  ref: string;
  excerpt: string;
  observedAt?: string;
};

type TriageItemRow = {
  id: string;
  source: "sentry" | "internal";
  title: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  environment: string | null;
  release_version: string | null;
  fingerprint: string;
  evidence: unknown;
  metadata?: unknown;
};

function truncate(input: string, maxLen: number) {
  return input.trim().slice(0, maxLen);
}

export function scrubSensitiveText(input: string, maxLen = 4000) {
  const trimmed = truncate(input, maxLen);
  return trimmed
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/\b(?:bearer\s+)?[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{10,}\b/gi, "[REDACTED_TOKEN]")
    .replace(/\b(?:token|api[_-]?key|secret|password)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

export function stableFingerprint(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 48);
}

export function buildClusterKey(title: string, fingerprint: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join("-");

  return `${base || "triage-item"}-${fingerprint.slice(0, 8)}`;
}

function toEvidenceArray(evidence: unknown): TriageEvidence[] {
  if (!Array.isArray(evidence)) return [];
  const mapped = evidence
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const source = typeof record.source === "string" ? record.source : "internal_report";
      const ref = typeof record.ref === "string" ? record.ref : "unknown";
      const excerpt = typeof record.excerpt === "string" ? record.excerpt : "";
      const observedAt = typeof record.observedAt === "string" ? record.observedAt : undefined;
      if (!excerpt.trim()) return null;
      return {
        source,
        ref,
        excerpt: scrubSensitiveText(excerpt, 500),
        observedAt
      };
    })
    .filter(Boolean);
  return mapped as TriageEvidence[];
}

function inferConfidence(summary: string, evidenceCount: number, route: string | null) {
  let score = 0;
  if (summary.length > 40) score += 1;
  if (summary.length > 120) score += 1;
  if (evidenceCount > 0) score += 1;
  if (evidenceCount > 1) score += 1;
  if (route) score += 1;

  if (score >= 4) return "high" as const;
  if (score >= 2) return "medium" as const;
  return "low" as const;
}

function inferTechnicalActions(issueType: string, summary: string) {
  const lower = summary.toLowerCase();

  if (issueType === "bug") {
    if (lower.includes("automatic metadata included") || (lower.includes("strange text") && lower.includes("support"))) {
      return [
        "Remove internal metadata copy from the end-user support form UI.",
        "Keep metadata capture server-side only and do not render correlation/debug fields to end users.",
        "Add a UI regression check to ensure internal/debug copy is not visible on public forms."
      ];
    }
    if (lower.includes("spinner") || lower.includes("loading")) {
      return [
        "Reproduce the loading path and inspect unresolved promise/error branches.",
        "Add timeout and failure-state handling so the UI exits loading deterministically.",
        "Add an end-to-end regression test for this route and state transition."
      ];
    }
    if (lower.includes("crash") || lower.includes("typeerror") || lower.includes("undefined")) {
      return [
        "Reproduce with the same input context and capture stack trace.",
        "Guard null/undefined access and validate assumptions before render/use.",
        "Ship with unit and integration tests covering the failing case."
      ];
    }
    return [
      "Reproduce the issue in the reported route/environment and capture exact failure point.",
      "Implement the minimal safe code fix and add regression coverage for the path.",
      "Deploy and monitor recurrence in support/triage signals."
    ];
  }

  if (issueType === "product_feedback") {
    return [
      "Cluster similar feedback and identify the most frequent friction pattern.",
      "Draft and test one focused UX/copy change addressing the reported confusion.",
      "Measure completion/support rate after release to confirm impact."
    ];
  }

  if (issueType === "process_improvement") {
    return [
      "Map current process steps causing friction and identify avoidable handoffs.",
      "Simplify or automate the highest-friction step with clear user messaging.",
      "Track resolution time and repeat-contact rate after process update."
    ];
  }

  return [
    "Review user path and identify where intent and UI behavior diverge.",
    "Prototype a focused UX improvement and validate with quick user testing.",
    "Release incrementally and monitor engagement/support trend."
  ];
}

export function buildProposalOutput(item: TriageItemRow, relatedIds: string[]) {
  const evidence = toEvidenceArray(item.evidence);
  const summary = scrubSensitiveText(item.summary, 2000);
  const normalizedSummary = summary.replace(/automatic metadata included:[\s\S]*$/i, "").trim() || summary;
  const clusterKey = buildClusterKey(item.title, item.fingerprint);
  const metadata = item.metadata && typeof item.metadata === "object" ? (item.metadata as Record<string, unknown>) : {};
  const supportCategory = typeof metadata.support_category === "string" ? metadata.support_category : null;
  const route = typeof metadata.last_route === "string" ? metadata.last_route : null;
  const browserOs = typeof metadata.browser_os === "string" ? metadata.browser_os : null;
  const confidence = inferConfidence(normalizedSummary, evidence.length, route);

  const reproduction = [
    `Open the app in ${item.environment || "the reported environment"}${browserOs ? ` (${browserOs})` : ""}.`,
    route ? `Navigate to ${route}.` : "Navigate to the route described in the report.",
    "Observe the error surface and compare with expected behavior."
  ];

  const citations = evidence.length
    ? evidence.map((entry) => ({
        source: entry.source === "sentry" ? "sentry_event" : "internal_report",
        ref: entry.ref,
        excerpt: entry.excerpt
      }))
    : [
        {
          source: "triage_item" as const,
          ref: item.id,
          excerpt: summary.slice(0, 240)
        }
      ];

  const issueType =
    supportCategory === "feedback"
      ? "product_feedback"
      : supportCategory === "billing"
        ? "process_improvement"
        : supportCategory === "other"
          ? "ux_improvement"
          : "bug";

  const expectedBehavior =
    issueType === "bug"
      ? "The flow should complete without runtime errors and preserve user input."
      : "The product flow should provide a clear, low-friction experience aligned with user intent.";

  const nextActions = inferTechnicalActions(issueType, normalizedSummary);
  const missingInformation = [
    !route ? "Exact route/screen where issue occurred." : null,
    confidence === "low" ? "Concrete reproduction sequence from user session." : null,
    evidence.length === 0 ? "A concrete example (error text or screenshot) to validate root cause." : null
  ].filter((item): item is string => Boolean(item));

  const plainLanguage =
    issueType === "bug"
      ? {
          problem: `Users are hitting a failure in the flow${route ? ` around ${route}` : ""}.`,
          userImpact: "People cannot complete the task reliably, which creates frustration, drop-off, and repeat support requests.",
          recommendedFix: "Patch the failing step directly, add a clear fallback state for failure/loading, and add a regression test for this exact flow.",
          expectedOutcome: "The affected flow should complete consistently, reducing drop-off and repeated reports for this issue.",
          tradeoffs: "Fix may require short-term engineering time and a small delay to ship with proper testing."
        }
      : {
          problem:
            normalizedSummary.toLowerCase().includes("automatic metadata included") || normalizedSummary.toLowerCase().includes("strange text")
              ? "Users are seeing internal/debug text in a customer-facing form."
              : `Users are signaling friction in the ${supportCategory || "current"} experience.`,
          userImpact: "People may abandon the flow early or need extra help, reducing engagement and satisfaction.",
          recommendedFix:
            normalizedSummary.toLowerCase().includes("automatic metadata included") || normalizedSummary.toLowerCase().includes("strange text")
              ? "Remove the internal metadata copy from user-facing UI and keep that data captured only in the backend payload."
              : "Apply one focused UX/process improvement targeting this friction pattern, then verify with completion and support metrics.",
          expectedOutcome: "Higher completion and satisfaction, with fewer repeated feedback tickets about the same pain point.",
          tradeoffs: "UX/process changes may require design review and iteration before measurable results appear."
        };

  return {
    schemaVersion: "1.0" as const,
    triageItemId: item.id,
    cluster: {
      key: clusterKey,
      rationale: `Grouped by stable fingerprint ${item.fingerprint.slice(0, 12)} and semantic title similarity for recurring behavior.`,
      relatedTriageItemIds: relatedIds.filter((id) => id !== item.id).slice(0, 10)
    },
    proposal: {
      issueType: issueType as "bug" | "product_feedback" | "ux_improvement" | "process_improvement",
      confidence,
      title: truncate(item.title, 200),
      summary: normalizedSummary,
      reproduction,
      expectedBehavior,
      actualBehavior: normalizedSummary,
      impact: `Severity is ${item.severity}. The issue can block core user flows and increase support load if unresolved.`,
      riskLevel: item.severity,
      nextActions,
      missingInformation,
      plainLanguage
    },
    citations
  };
}
