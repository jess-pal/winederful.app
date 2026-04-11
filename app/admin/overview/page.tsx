"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type OverviewResponse = {
  overview: {
    periodStart: string;
    totalStarts: number;
    totalCompletions: number;
    completionRate: number;
    totalSubmitFailures: number;
    totalShares: number;
    supportTickets: number;
    averageFeedbackRating: number | null;
    topPersona: { personaId: string; title: string; count: number } | null;
    topCountry: { countryCode: string; count: number } | null;
    biggestDropOff: { questionId: string; questionIndex: number; prompt: string; dropOffRate: number } | null;
    recentFeedback: Array<{ id: string; createdAt: string; text: string | null; rating: number | null }>;
  };
  days: number;
};

type InsightsResponse = {
  insights: Array<{
    id: string;
    createdAt: string;
    updatedAt: string;
    type: string;
    status: string;
    confidence: "low" | "medium" | "high";
    title: string;
    summary: string;
    evidence: Array<Record<string, unknown>>;
    metricPayload: Record<string, unknown>;
    periodStart: string | null;
    periodEnd: string | null;
    recommendations: Array<{
      id: string;
      type: string;
      confidence: "low" | "medium" | "high";
      title: string;
      summary: string;
      proposedAction: Record<string, unknown>;
      citations: Array<Record<string, unknown>>;
      approvalStatus: "pending" | "approved" | "dismissed" | "implemented";
      approvedBy: string | null;
      approvedAt: string | null;
    }>;
  }>;
  recommendationTotals: {
    pending: number;
    approved: number;
    dismissed: number;
    implemented: number;
  };
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function confidenceTone(confidence: "low" | "medium" | "high") {
  if (confidence === "high") return "bg-emerald-100 text-emerald-900";
  if (confidence === "medium") return "bg-amber-100 text-amber-900";
  return "bg-slate-200 text-slate-800";
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewResponse["overview"] | null>(null);
  const [insights, setInsights] = useState<InsightsResponse["insights"]>([]);
  const [recommendationTotals, setRecommendationTotals] = useState<InsightsResponse["recommendationTotals"] | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const authedFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!accessToken) throw new Error("No active session");

      const res = await fetch(path, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(init.headers || {})
        }
      });

      const data = await res.json();
      if (!res.ok) {
        const detail = typeof data.detail === "string" ? ` (${data.detail})` : "";
        throw new Error((data.error || "Request failed") + detail);
      }
      return data;
    },
    [accessToken]
  );

  const loadDashboard = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setStatusMessage(null);

    try {
      const [overviewData, insightData] = await Promise.all([
        authedFetch("/api/admin/analytics/overview?days=30", { method: "GET" }) as Promise<OverviewResponse>,
        authedFetch("/api/admin/analytics/insights?limit=20", { method: "GET" }) as Promise<InsightsResponse>
      ]);
      setOverview(overviewData.overview);
      setInsights(insightData.insights || []);
      setRecommendationTotals(insightData.recommendationTotals || null);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not load overview dashboard");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authedFetch]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setAccessToken(data.session?.access_token || null);
      setAuthChecked(true);
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token || null);
      setAuthChecked(true);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (authChecked && !accessToken) {
      router.push("/admin/login?next=/admin/overview");
    }
  }, [accessToken, authChecked, router]);

  const newestInsight = useMemo(() => insights[0] || null, [insights]);

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    await supabase.auth.signOut();
    setAccessToken(null);
    setStatusMessage("Signed out");
    router.push("/admin/login");
    router.refresh();
  }

  async function generateInsights() {
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await authedFetch("/api/admin/analytics/insights/generate", { method: "POST" });
      const created = typeof data?.result?.createdCount === "number" ? data.result.createdCount : 0;
      setStatusMessage(created ? `Generated ${created} new insight${created === 1 ? "" : "s"}.` : "Insight generation ran with no new items.");
      await loadDashboard();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not generate insights");
    } finally {
      setLoading(false);
    }
  }

  async function updateRecommendation(recommendationId: string, status: "approved" | "dismissed" | "implemented") {
    setActioningId(recommendationId);
    setStatusMessage(null);
    try {
      await authedFetch(`/api/admin/analytics/recommendations/${recommendationId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setStatusMessage(`Recommendation marked as ${status}.`);
      await loadDashboard();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not update recommendation");
    } finally {
      setActioningId(null);
    }
  }

  if (authChecked && !accessToken) return null;

  return (
    <main className="py-10">
      <Container className="max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl">Admin Overview</h1>
            <p className="text-sm text-[#F2EEE6]/78">One place to watch quiz health, friction, feedback, and what the system thinks needs attention next.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => void loadDashboard()} disabled={loading}>Refresh</Button>
            <Button onClick={() => void generateInsights()} disabled={loading}>Generate insights</Button>
            <Button variant="secondary" onClick={() => router.push("/admin/quiz")}>Quiz analytics</Button>
            <Button variant="secondary" onClick={() => router.push("/admin/triage")}>Bug triage</Button>
            <Button variant="secondary" onClick={() => router.push("/admin/support")}>Support</Button>
            <Button variant="secondary" onClick={signOut}>Sign out</Button>
          </div>
        </div>

        {statusMessage && <p className="rounded-xl border border-[#ff2e55]/35 bg-[#ff2e55]/12 px-3 py-2 text-sm text-[#F8DCE3]">{statusMessage}</p>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="space-y-2 !bg-white !text-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Quiz Starts</p>
            <p className="text-4xl font-semibold">{overview?.totalStarts ?? 0}</p>
            <p className="text-sm text-slate-600">Completions: {overview?.totalCompletions ?? 0}</p>
          </Card>
          <Card className="space-y-2 !bg-white !text-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Completion Rate</p>
            <p className="text-4xl font-semibold">{overview?.completionRate ?? 0}%</p>
            <p className="text-sm text-slate-600">Shares: {overview?.totalShares ?? 0}</p>
          </Card>
          <Card className="space-y-2 !bg-white !text-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Submit Failures</p>
            <p className="text-4xl font-semibold">{overview?.totalSubmitFailures ?? 0}</p>
            <p className="text-sm text-slate-600">Support tickets: {overview?.supportTickets ?? 0}</p>
          </Card>
          <Card className="space-y-2 !bg-white !text-slate-900">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Feedback Rating</p>
            <p className="text-4xl font-semibold">{overview?.averageFeedbackRating ?? "-"}</p>
            <p className="text-sm text-slate-600">30-day window</p>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="space-y-4 !bg-white !text-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold">Health Snapshot</h2>
                <p className="text-sm text-slate-600">Updated from events, results, support, and feedback.</p>
              </div>
              <p className="text-xs text-slate-500">Since {formatDateTime(overview?.periodStart)}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Top Persona</p>
                <p className="mt-2 text-lg font-semibold">{overview?.topPersona?.title || "No data yet"}</p>
                <p className="text-sm text-slate-600">{overview?.topPersona ? `${overview.topPersona.count} completions` : "Waiting for completions."}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Top Country</p>
                <p className="mt-2 text-lg font-semibold">{overview?.topCountry?.countryCode || "Unknown"}</p>
                <p className="text-sm text-slate-600">{overview?.topCountry ? `${overview.topCountry.count} quiz starts` : "No location data yet."}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Biggest Drop-off</p>
                <p className="mt-2 text-lg font-semibold">{overview?.biggestDropOff ? `Q${overview.biggestDropOff.questionIndex}` : "No signal yet"}</p>
                <p className="text-sm text-slate-600">{overview?.biggestDropOff ? `${overview.biggestDropOff.dropOffRate}% drop-off` : "Need more traffic to judge."}</p>
              </div>
            </div>

            {overview?.biggestDropOff && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Watch This Question</p>
                <p className="mt-2 text-lg font-semibold">Question {overview.biggestDropOff.questionIndex}</p>
                <p className="mt-1 text-sm text-slate-700">{overview.biggestDropOff.prompt}</p>
              </div>
            )}
          </Card>

          <Card className="space-y-4 !bg-white !text-slate-900">
            <div>
              <h2 className="text-2xl font-semibold">Recommendation Queue</h2>
              <p className="text-sm text-slate-600">Approval-gated actions generated from product signals.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Pending</p>
                <p className="mt-2 text-3xl font-semibold">{recommendationTotals?.pending ?? 0}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Approved</p>
                <p className="mt-2 text-3xl font-semibold">{recommendationTotals?.approved ?? 0}</p>
              </div>
            </div>
            {newestInsight ? (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Latest Insight</p>
                <p className="mt-2 text-lg font-semibold">{newestInsight.title}</p>
                <p className="mt-1 text-sm text-slate-700">{newestInsight.summary}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No insights yet. Run generation once events start flowing.</p>
            )}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card className="space-y-4 !bg-white !text-slate-900">
            <div>
              <h2 className="text-2xl font-semibold">Recent Feedback</h2>
              <p className="text-sm text-slate-600">Quick read on what real users are telling us after the quiz.</p>
            </div>
            <div className="space-y-3">
              {overview?.recentFeedback?.length ? (
                overview.recentFeedback.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Rating: {item.rating ?? "-"}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{item.text || "No free-text note left."}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No post-quiz feedback has been captured yet.</p>
              )}
            </div>
          </Card>

          <Card className="space-y-4 !bg-white !text-slate-900">
            <div>
              <h2 className="text-2xl font-semibold">Insights And Suggested Actions</h2>
              <p className="text-sm text-slate-600">This is the first pass of the background agent: it reads signals and drafts next steps, but waits for approval.</p>
            </div>
            <div className="space-y-4">
              {insights.length ? (
                insights.map((insight) => (
                  <div key={insight.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${confidenceTone(insight.confidence)}`}>
                        {insight.confidence} confidence
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">{insight.type.replace(/_/g, " ")}</span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">{insight.title}</h3>
                    <p className="mt-1 text-sm text-slate-700">{insight.summary}</p>

                    {insight.recommendations.length ? (
                      <div className="mt-4 space-y-3">
                        {insight.recommendations.map((recommendation) => (
                          <div key={recommendation.id} className="rounded-2xl bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900">{recommendation.title}</p>
                              <span className="text-xs uppercase tracking-wide text-slate-500">{recommendation.approvalStatus}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-700">{recommendation.summary}</p>
                            {recommendation.citations.length ? (
                              <div className="mt-3 space-y-1">
                                {recommendation.citations.slice(0, 2).map((citation, index) => (
                                  <p key={`${recommendation.id}-${index}`} className="text-xs text-slate-500">
                                    {String(citation.source || "signal")}: {String(citation.excerpt || citation.ref || "evidence")}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                className="px-3 py-2 text-xs"
                                onClick={() => void updateRecommendation(recommendation.id, "approved")}
                                disabled={actioningId === recommendation.id || recommendation.approvalStatus === "approved"}
                              >
                                Approve draft
                              </Button>
                              <Button
                                variant="secondary"
                                className="px-3 py-2 text-xs"
                                onClick={() => void updateRecommendation(recommendation.id, "dismissed")}
                                disabled={actioningId === recommendation.id || recommendation.approvalStatus === "dismissed"}
                              >
                                Dismiss
                              </Button>
                              <Button
                                variant="secondary"
                                className="px-3 py-2 text-xs"
                                onClick={() => void updateRecommendation(recommendation.id, "implemented")}
                                disabled={actioningId === recommendation.id || recommendation.approvalStatus === "implemented"}
                              >
                                Mark implemented
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-600">No attached recommendation yet.</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-600">No insights yet. Once events and feedback are flowing, this panel will start drafting what to review next.</p>
              )}
            </div>
          </Card>
        </div>
      </Container>
    </main>
  );
}
