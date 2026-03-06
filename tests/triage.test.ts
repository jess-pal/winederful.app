import { describe, expect, it } from "vitest";
import {
  internalIssueDraftCreateSchema,
  triageIntakeSchema,
  triageProposalOutputSchema
} from "../lib/zodSchemas";
import { buildProposalOutput, scrubSensitiveText } from "../lib/triage";

describe("triage schemas and helpers", () => {
  it("accepts valid triage intake payload", () => {
    const parsed = triageIntakeSchema.safeParse({
      source: "internal",
      fingerprint: "runtime-typeerror-quiz",
      title: "TypeError during quiz submit",
      summary: "User receives TypeError when submitting the quiz on /quiz.",
      severity: "high",
      evidence: [
        {
          source: "internal",
          ref: "ticket-123",
          excerpt: "TypeError: Cannot read properties of undefined"
        }
      ],
      metadata: {
        route: "/quiz"
      }
    });

    expect(parsed.success).toBe(true);
  });

  it("requires citations in proposal output", () => {
    const parsed = triageProposalOutputSchema.safeParse({
      schemaVersion: "1.0",
      triageItemId: "123e4567-e89b-12d3-a456-426614174000",
      cluster: {
        key: "quiz-submit-12345678",
        rationale: "same fingerprint",
        relatedTriageItemIds: []
      },
      proposal: {
        issueType: "bug",
        title: "Quiz submit TypeError",
        summary: "Submitting quiz crashes with TypeError",
        reproduction: ["Open quiz", "Click submit"],
        expectedBehavior: "Quiz submits without errors",
        actualBehavior: "TypeError is thrown",
        impact: "Users cannot submit quiz",
        riskLevel: "high",
        nextActions: ["Reproduce and patch"]
      },
      citations: []
    });

    expect(parsed.success).toBe(false);
  });

  it("enforces explicit approval for issue draft creation", () => {
    const proposal = buildProposalOutput(
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        source: "internal",
        title: "Quiz submit TypeError",
        summary: "TypeError while submitting quiz",
        severity: "high",
        environment: "production",
        release_version: "v1",
        fingerprint: "abc123abc123abc123abc123",
        evidence: [
          {
            source: "internal",
            ref: "ticket-1",
            excerpt: "TypeError while submitting quiz"
          }
        ]
      },
      []
    );

    const rejected = internalIssueDraftCreateSchema.safeParse({
      triageItemId: proposal.triageItemId,
      proposal,
      approval: {
        approved: false
      }
    });

    expect(rejected.success).toBe(false);
  });

  it("redacts sensitive tokens and emails in summaries", () => {
    const cleaned = scrubSensitiveText("Contact me at user@example.com token=abc123xyz456 and bearer aaa.bbb.ccc");
    expect(cleaned).not.toContain("user@example.com");
    expect(cleaned).toContain("[REDACTED_EMAIL]");
    expect(cleaned).toContain("[REDACTED]");
  });

  it("maps support feedback to non-bug proposal type", () => {
    const proposal = buildProposalOutput(
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        source: "internal",
        title: "Feedback: improve onboarding copy",
        summary: "Users report onboarding instructions are unclear.",
        severity: "medium",
        environment: "production",
        release_version: "v1",
        fingerprint: "abc123abc123abc123abc123",
        evidence: [],
        metadata: {
          support_category: "feedback"
        }
      },
      []
    );

    expect(proposal.proposal.issueType).toBe("product_feedback");
    expect(["low", "medium", "high"]).toContain(proposal.proposal.confidence);
    expect(proposal.proposal.plainLanguage.problem.length).toBeGreaterThan(10);
  });

  it("targets removal of internal metadata text when reported in support form", () => {
    const proposal = buildProposalOutput(
      {
        id: "123e4567-e89b-12d3-a456-426614174001",
        source: "internal",
        title: "Strange text in support form",
        summary:
          "There is this strange text on the support/feedback form. Automatic metadata included: Correlation ID: abc Browser/OS: Chrome on macOS",
        severity: "low",
        environment: "support_report",
        release_version: "dev",
        fingerprint: "def456def456def456def456",
        evidence: [],
        metadata: {
          support_category: "feedback",
          last_route: "/support"
        }
      },
      []
    );

    expect(proposal.proposal.plainLanguage.recommendedFix.toLowerCase()).toContain("remove");
    expect(proposal.proposal.summary.toLowerCase()).not.toContain("automatic metadata included");
  });
});
