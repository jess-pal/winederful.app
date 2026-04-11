import { db } from "@/lib/db";
import { QUIZ_QUESTIONS } from "@/lib/scoring/questions";
import { PERSONAS } from "@/lib/scoring/personas";

type ProductEventRow = {
  created_at: string;
  session_id: string | null;
  event_name: string;
  route: string | null;
  question_id: string | null;
  question_index: number | null;
  persona_id: string | null;
  metadata: Record<string, unknown> | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  source: string | null;
};

type QuizSessionRow = {
  id: string;
  created_at: string;
  result_persona: string;
  result_payload: {
    title?: string;
  } | null;
};

type QuizFeedbackRow = {
  id: string;
  created_at: string;
  session_id: string;
  rating: number | null;
  feedback_text: string | null;
  felt_accurate: boolean | null;
  would_share: boolean | null;
  metadata: Record<string, unknown> | null;
};

type ProductInsightRow = {
  id: string;
  created_at: string;
  updated_at: string;
  type: string;
  status: "open" | "approved" | "dismissed" | "resolved";
  confidence: "low" | "medium" | "high";
  title: string;
  summary: string;
  evidence: Array<Record<string, unknown>> | null;
  metric_payload: Record<string, unknown> | null;
  period_start: string | null;
  period_end: string | null;
};

type ProductRecommendationRow = {
  id: string;
  created_at: string;
  updated_at: string;
  insight_id: string | null;
  type: string;
  confidence: "low" | "medium" | "high";
  title: string;
  summary: string;
  proposed_action: Record<string, unknown> | null;
  citations: Array<Record<string, unknown>> | null;
  approval_status: "pending" | "approved" | "dismissed" | "implemented";
  approved_by: string | null;
  approved_at: string | null;
};

const personaTitleById = new Map(PERSONAS.map((persona) => [persona.personaId, persona.title]));

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function countBy<T>(rows: T[], getKey: (row: T) => string | null | undefined) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = getKey(row);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function topEntries(map: Map<string, number>, limit = 5) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function percentage(part: number, total: number) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

async function loadAnalyticsRows(days = 30) {
  const since = isoDaysAgo(days);
  const [eventsRes, sessionsRes, feedbackRes, supportRes] = await Promise.all([
    db
      .from("product_events")
      .select(
        "created_at, session_id, event_name, route, question_id, question_index, persona_id, metadata, country_code, region, city, device_type, browser, os, referrer, source"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10000),
    db.from("quiz_sessions").select("id, created_at, result_persona, result_payload").gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
    db
      .from("quiz_feedback")
      .select("id, created_at, session_id, rating, feedback_text, felt_accurate, would_share, metadata")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000),
    db.from("support_tickets").select("id", { count: "exact", head: true }).gte("created_at", since)
  ]);

  if (eventsRes.error) throw new Error(`Could not load product events: ${eventsRes.error.message}`);
  if (sessionsRes.error) throw new Error(`Could not load quiz sessions: ${sessionsRes.error.message}`);
  if (feedbackRes.error) throw new Error(`Could not load quiz feedback: ${feedbackRes.error.message}`);
  if (supportRes.error) throw new Error(`Could not load support tickets: ${supportRes.error.message}`);

  return {
    events: (eventsRes.data || []) as ProductEventRow[],
    sessions: (sessionsRes.data || []) as QuizSessionRow[],
    feedback: (feedbackRes.data || []) as QuizFeedbackRow[],
    supportCount: supportRes.count || 0,
    since
  };
}

export async function getOverviewMetrics(days = 30) {
  const { events, sessions, feedback, supportCount, since } = await loadAnalyticsRows(days);
  const starts = events.filter((event) => event.event_name === "quiz_started").length;
  const completions = events.filter((event) => event.event_name === "quiz_completed").length || sessions.length;
  const submitFailures = events.filter((event) => event.event_name === "quiz_submit_failed").length;
  const shares = events.filter((event) => event.event_name === "share_clicked" || event.event_name === "share_copied").length;
  const avgRatingValues = feedback.map((item) => item.rating).filter((value): value is number => typeof value === "number");
  const averageRating = avgRatingValues.length ? Math.round((avgRatingValues.reduce((sum, value) => sum + value, 0) / avgRatingValues.length) * 100) / 100 : null;

  const personaCounts = countBy(sessions, (row) => row.result_persona);
  const topPersona = topEntries(personaCounts, 1)[0] || null;
  const countryCounts = countBy(
    events.filter((event) => event.event_name === "quiz_started"),
    (row) => row.country_code
  );
  const topCountry = topEntries(countryCounts, 1)[0] || null;

  const funnel = buildQuestionFunnel(events, completions);
  const biggestDropOff = funnel.reduce<(typeof funnel)[number] | null>((currentBest, question) => {
    if (!currentBest || question.dropOffRate > currentBest.dropOffRate) {
      return question;
    }
    return currentBest;
  }, null);

  const recentFeedback = feedback
    .filter((item) => item.feedback_text)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      createdAt: item.created_at,
      text: item.feedback_text,
      rating: item.rating
    }));

  return {
    periodStart: since,
    totalStarts: starts,
    totalCompletions: completions,
    completionRate: percentage(completions, starts),
    totalSubmitFailures: submitFailures,
    totalShares: shares,
    supportTickets: supportCount,
    averageFeedbackRating: averageRating,
    topPersona: topPersona
      ? {
          personaId: topPersona.key,
          title: personaTitleById.get(topPersona.key) || topPersona.key,
          count: topPersona.count
        }
      : null,
    topCountry: topCountry
      ? {
          countryCode: topCountry.key,
          count: topCountry.count
        }
      : null,
    biggestDropOff: biggestDropOff
      ? {
          questionId: biggestDropOff.questionId,
          questionIndex: biggestDropOff.questionIndex,
          prompt: biggestDropOff.prompt,
          dropOffRate: biggestDropOff.dropOffRate
        }
      : null,
    recentFeedback
  };
}

function buildQuestionFunnel(events: ProductEventRow[], completions: number) {
  return QUIZ_QUESTIONS.map((question, index) => {
    const questionIndex = index + 1;
    const viewed = events.filter((event) => event.event_name === "question_viewed" && event.question_id === question.id).length;
    const advanced =
      index === QUIZ_QUESTIONS.length - 1
        ? completions
        : events.filter((event) => event.event_name === "question_advanced" && event.question_id === question.id).length;
    const backClicks = events.filter((event) => event.event_name === "question_back_clicked" && event.question_id === question.id).length;
    const durationValues = events
      .filter((event) => (event.event_name === "question_advanced" || event.event_name === "question_back_clicked") && event.question_id === question.id)
      .map((event) => Number(event.metadata?.durationMs || 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    const averageDurationMs = durationValues.length ? Math.round(durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length) : 0;
    const dropOffCount = Math.max(viewed - advanced, 0);
    return {
      questionId: question.id,
      questionIndex,
      prompt: question.prompt,
      viewedCount: viewed,
      advancedCount: advanced,
      dropOffCount,
      dropOffRate: percentage(dropOffCount, viewed),
      averageDurationMs,
      backClicks
    };
  });
}

export async function getQuizAnalytics(days = 30) {
  const { events, sessions, feedback } = await loadAnalyticsRows(days);
  const completions = events.filter((event) => event.event_name === "quiz_completed").length || sessions.length;
  const funnel = buildQuestionFunnel(events, completions);
  const topPersonas = topEntries(countBy(sessions, (row) => row.result_persona), 8).map((entry) => ({
    personaId: entry.key,
    title: personaTitleById.get(entry.key) || entry.key,
    count: entry.count,
    percentage: percentage(entry.count, sessions.length)
  }));
  const topCountries = topEntries(countBy(events.filter((event) => event.event_name === "quiz_started"), (row) => row.country_code), 8).map((entry) => ({
    countryCode: entry.key,
    count: entry.count
  }));
  const browserBreakdown = topEntries(countBy(events.filter((event) => event.event_name === "quiz_started"), (row) => row.browser), 8).map((entry) => ({
    browser: entry.key,
    count: entry.count
  }));
  const sourceBreakdown = topEntries(countBy(events.filter((event) => event.event_name === "quiz_started"), (row) => row.source || "direct"), 8).map((entry) => ({
    source: entry.key,
    count: entry.count
  }));

  const recentFeedback = feedback.slice(0, 20).map((item) => ({
    id: item.id,
    createdAt: item.created_at,
    sessionId: item.session_id,
    rating: item.rating,
    feedbackText: item.feedback_text,
    feltAccurate: item.felt_accurate,
    wouldShare: item.would_share,
    personaId: typeof item.metadata?.personaId === "string" ? item.metadata.personaId : null
  }));

  return {
    funnel,
    topPersonas,
    topCountries,
    browserBreakdown,
    sourceBreakdown,
    totalSessions: sessions.length,
    totalFeedback: feedback.length,
    recentFeedback
  };
}

export async function getInsightAnalytics(limit = 25) {
  const [insightsRes, recommendationsRes] = await Promise.all([
    db.from("product_insights").select("*").order("created_at", { ascending: false }).limit(limit),
    db.from("product_recommendations").select("*").order("created_at", { ascending: false }).limit(limit * 2)
  ]);

  if (insightsRes.error) throw new Error(`Could not load product insights: ${insightsRes.error.message}`);
  if (recommendationsRes.error) throw new Error(`Could not load recommendations: ${recommendationsRes.error.message}`);

  const insights = (insightsRes.data || []) as ProductInsightRow[];
  const recommendations = (recommendationsRes.data || []) as ProductRecommendationRow[];
  const recommendationsByInsightId = new Map<string, ProductRecommendationRow[]>();

  for (const recommendation of recommendations) {
    if (!recommendation.insight_id) continue;
    const current = recommendationsByInsightId.get(recommendation.insight_id) || [];
    current.push(recommendation);
    recommendationsByInsightId.set(recommendation.insight_id, current);
  }

  return {
    insights: insights.map((insight) => ({
      id: insight.id,
      createdAt: insight.created_at,
      updatedAt: insight.updated_at,
      type: insight.type,
      status: insight.status,
      confidence: insight.confidence,
      title: insight.title,
      summary: insight.summary,
      evidence: insight.evidence || [],
      metricPayload: insight.metric_payload || {},
      periodStart: insight.period_start,
      periodEnd: insight.period_end,
      recommendations: (recommendationsByInsightId.get(insight.id) || []).map((recommendation) => ({
        id: recommendation.id,
        createdAt: recommendation.created_at,
        updatedAt: recommendation.updated_at,
        type: recommendation.type,
        confidence: recommendation.confidence,
        title: recommendation.title,
        summary: recommendation.summary,
        proposedAction: recommendation.proposed_action || {},
        citations: recommendation.citations || [],
        approvalStatus: recommendation.approval_status,
        approvedBy: recommendation.approved_by,
        approvedAt: recommendation.approved_at
      }))
    })),
    recommendationTotals: {
      pending: recommendations.filter((item) => item.approval_status === "pending").length,
      approved: recommendations.filter((item) => item.approval_status === "approved").length,
      dismissed: recommendations.filter((item) => item.approval_status === "dismissed").length,
      implemented: recommendations.filter((item) => item.approval_status === "implemented").length
    }
  };
}

export async function updateRecommendationApproval(options: {
  recommendationId: string;
  status: "approved" | "dismissed" | "implemented";
  actorId: string;
  note?: string | null;
}) {
  const now = new Date().toISOString();

  const { data: recommendation, error: loadError } = await db
    .from("product_recommendations")
    .select("id, insight_id, type, title")
    .eq("id", options.recommendationId)
    .single();

  if (loadError || !recommendation) {
    throw new Error(`Could not load recommendation: ${loadError?.message || options.recommendationId}`);
  }

  const { error: updateError } = await db
    .from("product_recommendations")
    .update({
      approval_status: options.status,
      approved_by: options.actorId,
      approved_at: now,
      updated_at: now
    })
    .eq("id", options.recommendationId);

  if (updateError) {
    throw new Error(`Could not update recommendation: ${updateError.message}`);
  }

  if (options.status === "approved" || options.status === "implemented") {
    await db.from("approved_actions").insert({
      recommendation_id: options.recommendationId,
      action_type: recommendation.type,
      status: options.status === "implemented" ? "implemented" : "approved",
      result_payload: {
        note: options.note || null
      }
    });
  }

  await db.from("audit_logs").insert({
    actor_type: "admin",
    actor_id: options.actorId,
    action: `product_recommendation_${options.status}`,
    target_type: "product_recommendation",
    target_id: options.recommendationId,
    metadata: {
      recommendation_title: recommendation.title,
      insight_id: recommendation.insight_id,
      note: options.note || null
    }
  });

  return {
    id: options.recommendationId,
    status: options.status,
    approvedBy: options.actorId,
    approvedAt: now
  };
}

type GeneratedInsight = {
  type: string;
  confidence: "low" | "medium" | "high";
  title: string;
  summary: string;
  evidence: Array<Record<string, unknown>>;
  metricPayload: Record<string, unknown>;
  recommendation: {
    type: string;
    confidence: "low" | "medium" | "high";
    title: string;
    summary: string;
    proposedAction: Record<string, unknown>;
    citations: Array<Record<string, unknown>>;
  } | null;
};

function buildGeneratedInsights(overview: Awaited<ReturnType<typeof getOverviewMetrics>>, quiz: Awaited<ReturnType<typeof getQuizAnalytics>>) {
  const insights: GeneratedInsight[] = [];

  if (overview.totalSubmitFailures > 0) {
    insights.push({
      type: "bug_failure_spike",
      confidence: "high",
      title: "Quiz submit failures detected",
      summary: `${overview.totalSubmitFailures} quiz submit failures were recorded in the current analysis window.`,
      evidence: [{ metric: "submitFailures", value: overview.totalSubmitFailures }],
      metricPayload: { submitFailures: overview.totalSubmitFailures },
      recommendation: {
        type: "bug_fix",
        confidence: "high",
        title: "Prioritize quiz submit reliability",
        summary: "Investigate the submit path, Supabase connectivity, and failed API routes before pushing more traffic through the funnel.",
        proposedAction: {
          action: "create_bug_fix_draft",
          targetArea: "/api/quiz/submit"
        },
        citations: [{ source: "product_events", ref: "quiz_submit_failed", excerpt: `${overview.totalSubmitFailures} submit failures recorded.` }]
      }
    });
  }

  if (overview.biggestDropOff && overview.biggestDropOff.dropOffRate >= 20) {
    insights.push({
      type: "funnel_dropoff",
      confidence: overview.biggestDropOff.dropOffRate >= 35 ? "high" : "medium",
      title: `Drop-off spikes at question ${overview.biggestDropOff.questionIndex}`,
      summary: `${overview.biggestDropOff.dropOffRate}% of users who reach "${overview.biggestDropOff.prompt}" do not advance past it.`,
      evidence: [
        {
          questionId: overview.biggestDropOff.questionId,
          questionIndex: overview.biggestDropOff.questionIndex,
          dropOffRate: overview.biggestDropOff.dropOffRate
        }
      ],
      metricPayload: overview.biggestDropOff,
      recommendation: {
        type: "completion_improvement",
        confidence: overview.biggestDropOff.dropOffRate >= 35 ? "high" : "medium",
        title: `Rewrite or simplify question ${overview.biggestDropOff.questionIndex}`,
        summary: "Review the prompt, answer clarity, and answer density for the highest-friction question.",
        proposedAction: {
          action: "draft_question_rewrite",
          questionId: overview.biggestDropOff.questionId
        },
        citations: [
          {
            source: "product_events",
            ref: overview.biggestDropOff.questionId,
            excerpt: `${overview.biggestDropOff.dropOffRate}% drop-off at question ${overview.biggestDropOff.questionIndex}.`
          }
        ]
      }
    });
  }

  if (overview.completionRate > 0 && overview.completionRate < 60) {
    insights.push({
      type: "completion_rate_low",
      confidence: "medium",
      title: "Completion rate is low",
      summary: `Only ${overview.completionRate}% of quiz starts are currently reaching completion.`,
      evidence: [{ starts: overview.totalStarts, completions: overview.totalCompletions, completionRate: overview.completionRate }],
      metricPayload: { starts: overview.totalStarts, completions: overview.totalCompletions, completionRate: overview.completionRate },
      recommendation: {
        type: "ux_improvement",
        confidence: "medium",
        title: "Review funnel friction and clarity",
        summary: "Tighten question copy, surface progress feedback more clearly, and review where users hesitate before the final submit.",
        proposedAction: {
          action: "draft_funnel_improvement_task"
        },
        citations: [{ source: "product_events", ref: "quiz_started/quiz_completed", excerpt: `${overview.completionRate}% completion rate.` }]
      }
    });
  }

  if (overview.topPersona && overview.totalCompletions > 10 && percentage(overview.topPersona.count, overview.totalCompletions) >= 40) {
    const personaShare = percentage(overview.topPersona.count, overview.totalCompletions);
    insights.push({
      type: "persona_imbalance",
      confidence: "medium",
      title: `${overview.topPersona.title} dominates results`,
      summary: `${overview.topPersona.title} currently makes up ${personaShare}% of completions, which may mean the quiz is over-weighting one path or the persona set needs expansion.`,
      evidence: [{ personaId: overview.topPersona.personaId, title: overview.topPersona.title, percentage: personaShare }],
      metricPayload: { personaId: overview.topPersona.personaId, percentage: personaShare },
      recommendation: {
        type: "persona_expansion",
        confidence: "medium",
        title: "Review persona balance and expansion",
        summary: "Check trait weighting and consider adding more persona archetypes if results feel too concentrated.",
        proposedAction: {
          action: "draft_persona_review"
        },
        citations: [{ source: "quiz_sessions", ref: overview.topPersona.personaId, excerpt: `${personaShare}% of recent completions map to this persona.` }]
      }
    });
  }

  if (quiz.recentFeedback.some((item) => item.feedbackText)) {
    insights.push({
      type: "feedback_signal",
      confidence: "low",
      title: "New qualitative feedback available",
      summary: "Users are leaving typed feedback that can be reviewed for confusion, weak copy, and persona quality issues.",
      evidence: quiz.recentFeedback
        .filter((item) => item.feedbackText)
        .slice(0, 3)
        .map((item) => ({ feedbackId: item.id, excerpt: item.feedbackText })),
      metricPayload: { feedbackCount: quiz.recentFeedback.filter((item) => item.feedbackText).length },
      recommendation: {
        type: "ux_improvement",
        confidence: "low",
        title: "Review typed feedback themes",
        summary: "Cluster recent typed feedback to identify repeat complaints or opportunities for copy improvements.",
        proposedAction: {
          action: "draft_feedback_theme_review"
        },
        citations: quiz.recentFeedback
          .filter((item) => item.feedbackText)
          .slice(0, 3)
          .map((item) => ({ source: "quiz_feedback", ref: item.id, excerpt: item.feedbackText || "" }))
      }
    });
  }

  return insights;
}

export async function generateProductInsights(options: { actorType: "system" | "admin"; actorId: string | null }) {
  const overview = await getOverviewMetrics(30);
  const quiz = await getQuizAnalytics(30);
  const generated = buildGeneratedInsights(overview, quiz);
  const periodStart = isoDaysAgo(30);
  const periodEnd = new Date().toISOString();

  const created: Array<{ insightId: string; recommendationId: string | null }> = [];

  for (const insight of generated) {
    const { data: insertedInsight, error: insightError } = await db
      .from("product_insights")
      .insert({
        type: insight.type,
        confidence: insight.confidence,
        title: insight.title,
        summary: insight.summary,
        evidence: insight.evidence,
        metric_payload: insight.metricPayload,
        period_start: periodStart,
        period_end: periodEnd
      })
      .select("id")
      .single();

    if (insightError || !insertedInsight) {
      throw new Error(`Could not create product insight: ${insightError?.message || insight.title}`);
    }

    let recommendationId: string | null = null;
    if (insight.recommendation) {
      const { data: insertedRecommendation, error: recommendationError } = await db
        .from("product_recommendations")
        .insert({
          insight_id: insertedInsight.id,
          type: insight.recommendation.type,
          confidence: insight.recommendation.confidence,
          title: insight.recommendation.title,
          summary: insight.recommendation.summary,
          proposed_action: insight.recommendation.proposedAction,
          citations: insight.recommendation.citations
        })
        .select("id")
        .single();

      if (recommendationError || !insertedRecommendation) {
        throw new Error(`Could not create recommendation: ${recommendationError?.message || insight.recommendation.title}`);
      }
      recommendationId = insertedRecommendation.id;
    }

    created.push({ insightId: insertedInsight.id, recommendationId });
  }

  await db.from("audit_logs").insert({
    actor_type: options.actorType,
    actor_id: options.actorId,
    action: "product_insights_generated",
    target_type: "product_insights",
    target_id: null,
    metadata: {
      count: created.length,
      period_start: periodStart,
      period_end: periodEnd
    }
  });

  return {
    createdCount: created.length,
    created
  };
}
