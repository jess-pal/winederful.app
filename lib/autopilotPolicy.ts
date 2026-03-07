import { env } from "@/lib/env";

export type AutopilotRiskClass = "low" | "medium" | "high";

export function autopilotQueueEnabled() {
  return env.AUTOPILOT_ENABLE_QUEUE === "true";
}

export function autopilotPrDraftsEnabled() {
  return env.AUTOPILOT_ALLOW_PR_DRAFTS === "true";
}

export function classifyProposalRisk(input: {
  severity: "low" | "medium" | "high" | "critical";
  issueType: "bug" | "product_feedback" | "ux_improvement" | "process_improvement";
  confidence: "low" | "medium" | "high";
}) {
  if (input.severity === "critical" || input.severity === "high") return "high" as const;
  if (input.confidence === "low") return "medium" as const;
  if (input.issueType === "bug") return "medium" as const;
  return "low" as const;
}

export function isSafeForPrDraft(riskClass: AutopilotRiskClass) {
  return autopilotPrDraftsEnabled() && riskClass === "low";
}
