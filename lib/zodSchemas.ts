import { z } from "zod";

export const answerSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1)
});

export const quizSubmitSchema = z.object({
  answers: z.array(answerSchema).length(10)
});

export const shareResolveSchema = z.object({
  token: z.string().min(10).max(128)
});

export const emailSignupSchema = z.object({
  email: z.string().email(),
  marketingOptIn: z.boolean().refine((v) => v, { message: "Marketing consent is required" }),
  consentVersion: z.string().min(1),
  source: z.string().max(64).optional()
});

export const shareTrackSchema = z.object({
  sharePath: z.string().regex(/^\/share\/[A-Za-z0-9_-]{10,128}$/),
  platform: z.enum(["x", "facebook", "linkedin", "whatsapp", "copy", "native"]),
  sessionId: z.string().uuid().optional()
});

export const profileUpsertSchema = z.object({
  displayName: z.string().max(80).optional(),
  personaId: z.string().max(80).optional(),
  favoriteStyles: z.array(z.string().min(1).max(80)).max(10).optional()
});

export const supportCreateSchema = z.object({
  category: z.enum(["bug", "feedback", "billing", "other"]),
  description: z.string().min(10).max(3000),
  subject: z.string().max(160).optional(),
  contactEmail: z.string().email().optional(),
  correlationId: z.string().uuid(),
  browserOs: z.string().max(120),
  lastRoute: z.string().max(200),
  appVersion: z.string().max(120).optional()
});

export const adminTicketUpdateSchema = z.object({
  status: z.enum(["open", "pending", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional()
});

export const adminReplySchema = z.object({
  ticketId: z.string().uuid(),
  message: z.string().min(2).max(3000)
});

export const triageIntakeSchema = z.object({
  source: z.enum(["sentry", "internal"]),
  sourceEventId: z.string().max(128).optional(),
  sourceLink: z.string().url().max(400).optional(),
  fingerprint: z.string().min(8).max(160),
  title: z.string().min(4).max(200),
  summary: z.string().min(10).max(4000),
  severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  environment: z.string().max(80).optional(),
  releaseVersion: z.string().max(120).optional(),
  occurredAt: z.string().datetime().optional(),
  evidence: z
    .array(
      z.object({
        source: z.string().min(1).max(40),
        ref: z.string().min(1).max(300),
        excerpt: z.string().min(1).max(500),
        observedAt: z.string().datetime().optional()
      })
    )
    .max(20)
    .default([]),
  metadata: z.record(z.unknown()).default({})
});

export const triageItemUpdateSchema = z.object({
  status: z.enum(["open", "triaged", "draft_ready", "ignored", "resolved"])
});

export const proposalCitationSchema = z.object({
  source: z.enum(["triage_item", "support_ticket", "sentry_event", "internal_report"]),
  ref: z.string().min(1).max(300),
  excerpt: z.string().min(1).max(500)
});

export const triageProposalOutputSchema = z.object({
  schemaVersion: z.literal("1.0"),
  triageItemId: z.string().uuid(),
  cluster: z.object({
    key: z.string().min(4).max(180),
    rationale: z.string().min(12).max(1200),
    relatedTriageItemIds: z.array(z.string().uuid()).max(10)
  }),
  proposal: z.object({
    issueType: z.enum(["bug", "product_feedback", "ux_improvement", "process_improvement"]),
    confidence: z.enum(["low", "medium", "high"]),
    title: z.string().min(6).max(200),
    summary: z.string().min(10).max(2000),
    reproduction: z.array(z.string().min(3).max(400)).min(1).max(8),
    expectedBehavior: z.string().min(6).max(1000),
    actualBehavior: z.string().min(6).max(1000),
    impact: z.string().min(6).max(1200),
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    nextActions: z.array(z.string().min(3).max(300)).min(1).max(8),
    missingInformation: z.array(z.string().min(3).max(300)).max(8),
    plainLanguage: z.object({
      problem: z.string().min(10).max(1200),
      userImpact: z.string().min(10).max(1200),
      recommendedFix: z.string().min(10).max(1200),
      expectedOutcome: z.string().min(10).max(1200),
      tradeoffs: z.string().min(6).max(800)
    })
  }),
  citations: z.array(proposalCitationSchema).min(1).max(20)
});

export const triageProposalRequestSchema = z.object({
  triageItemId: z.string().uuid()
});

export const internalIssueDraftCreateSchema = z.object({
  triageItemId: z.string().uuid(),
  proposal: triageProposalOutputSchema,
  approval: z.object({
    approved: z.literal(true),
    note: z.string().min(3).max(500).optional()
  })
});
