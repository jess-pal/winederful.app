"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type TriageItem = {
  id: string;
  created_at: string;
  updated_at: string;
  first_seen_at: string;
  last_seen_at: string;
  status: "open" | "triaged" | "draft_ready" | "ignored" | "resolved";
  source: "sentry" | "internal";
  source_event_id: string | null;
  source_link: string | null;
  title: string;
  summary: string;
  severity: "low" | "medium" | "high" | "critical";
  environment: string | null;
  release_version: string | null;
  occurrence_count: number;
  evidence?: Array<{ source: string; ref: string; excerpt: string }>;
};

type Proposal = {
  schemaVersion: "1.0";
  triageItemId: string;
  cluster: {
    key: string;
    rationale: string;
    relatedTriageItemIds: string[];
  };
  proposal: {
    issueType: "bug" | "product_feedback" | "ux_improvement" | "process_improvement";
    confidence: "low" | "medium" | "high";
    title: string;
    summary: string;
    reproduction: string[];
    expectedBehavior: string;
    actualBehavior: string;
    impact: string;
    riskLevel: "low" | "medium" | "high" | "critical";
    nextActions: string[];
    missingInformation: string[];
    plainLanguage: {
      problem: string;
      userImpact: string;
      recommendedFix: string;
      expectedOutcome: string;
      tradeoffs: string;
    };
  };
  citations: Array<{
    source: "triage_item" | "support_ticket" | "sentry_event" | "internal_report";
    ref: string;
    excerpt: string;
  }>;
};

type IssueDraft = {
  id: string;
  triage_item_id: string;
  status: string;
  draft_title: string;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
};

type TriageReport = {
  id: string;
  report_date: string;
  period_start: string;
  period_end: string;
  summary_text: string;
  report_payload: {
    recommendations?: string[];
  };
  created_at: string;
};

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function AdminTriagePage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [items, setItems] = useState<TriageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<TriageItem | null>(null);
  const [issueDrafts, setIssueDrafts] = useState<IssueDraft[]>([]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [reports, setReports] = useState<TriageReport[]>([]);

  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [approvalChecked, setApprovalChecked] = useState(false);
  const [approvalNote, setApprovalNote] = useState("");

  const selectedSummary = useMemo(() => {
    if (!selectedItem) return "";
    return `${selectedItem.source} • ${selectedItem.severity} • ${selectedItem.status} • ${selectedItem.occurrence_count} occurrences`;
  }, [selectedItem]);

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

  const loadItems = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterSeverity !== "all") params.set("severity", filterSeverity);
      const data = await authedFetch(`/api/admin/triage/items?${params.toString()}`, { method: "GET" });

      const nextItems = (data.items || []) as TriageItem[];
      setItems(nextItems);

      if (nextItems.length === 0) {
        setSelectedId(null);
        setSelectedItem(null);
        setIssueDrafts([]);
        setProposal(null);
        return;
      }

      const fallbackId = nextItems[0].id;
      const nextSelectedId = nextItems.some((item) => item.id === selectedId) ? selectedId : fallbackId;
      if (nextSelectedId) setSelectedId(nextSelectedId);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not load triage items");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authedFetch, filterSeverity, filterStatus, selectedId]);

  const loadDetail = useCallback(
    async (id: string) => {
      if (!accessToken) return;

      setLoading(true);
      setStatusMessage(null);
      try {
        const data = await authedFetch(`/api/admin/triage/items/${id}`, { method: "GET" });
        setSelectedItem((data.item || null) as TriageItem | null);
        setIssueDrafts((data.issueDrafts || []) as IssueDraft[]);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Could not load triage details");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, authedFetch]
  );

  const loadReports = useCallback(async () => {
    if (!accessToken) return;
    try {
      const data = await authedFetch("/api/admin/triage/reports", { method: "GET" });
      setReports((data.reports || []) as TriageReport[]);
    } catch {
      // Keep triage UI usable even if reports fail to load.
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
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  useEffect(() => {
    if (authChecked && !accessToken) {
      router.push("/admin/login?next=/admin/triage");
    }
  }, [accessToken, authChecked, router]);

  async function syncSentry() {
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await authedFetch("/api/admin/triage/intake/sentry", { method: "POST" });
      setStatusMessage(`Sentry sync complete: ${data.inserted} inserted, ${data.updated} updated`);
      await loadItems();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not sync Sentry");
    } finally {
      setLoading(false);
    }
  }

  async function syncSupportTickets() {
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await authedFetch("/api/admin/triage/intake/support", { method: "POST", body: "{}" });
      const errorHint = data.errors?.length ? ` First error: ${data.errors[0]}` : "";
      setStatusMessage(`Support sync complete: scanned ${data.scanned}, inserted ${data.inserted}, updated ${data.updated}, failed ${data.failed}.${errorHint}`);
      await loadItems();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not sync support tickets");
    } finally {
      setLoading(false);
    }
  }

  async function generateDailyReport() {
    setLoading(true);
    setStatusMessage(null);
    try {
      await authedFetch("/api/admin/triage/reports/generate", { method: "POST", body: "{}" });
      setStatusMessage("Daily triage summary generated.");
      await loadReports();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not generate triage summary");
    } finally {
      setLoading(false);
    }
  }

  async function sendDigestEmail() {
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await authedFetch("/api/admin/triage/reports/send-email", { method: "POST", body: "{}" });
      if (data.sent) {
        setStatusMessage(`Digest email sent for report date ${data.reportDate}.`);
      } else {
        setStatusMessage(data.reason || "Digest email not sent.");
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not send digest email");
    } finally {
      setLoading(false);
    }
  }

  async function triggerSentryTestEvent() {
    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await authedFetch("/api/debug/sentry-test", { method: "POST", body: "{}" });
      setStatusMessage(`Sentry test event sent. Marker: ${data.marker}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not trigger Sentry test event");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(status: TriageItem["status"]) {
    if (!selectedId) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await authedFetch(`/api/admin/triage/items/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      setSelectedItem((prev) =>
        prev && prev.id === data.item.id
          ? {
              ...prev,
              status: data.item.status,
              updated_at: data.item.updated_at
            }
          : prev
      );
      setItems((prev) => prev.map((item) => (item.id === data.item.id ? { ...item, status: data.item.status, updated_at: data.item.updated_at } : item)));
      setStatusMessage("Triage item updated");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not update status");
    } finally {
      setLoading(false);
    }
  }

  async function generateProposal() {
    if (!selectedId) return;

    setLoading(true);
    setStatusMessage(null);
    setProposal(null);
    try {
      const data = await authedFetch("/api/admin/triage/proposal", {
        method: "POST",
        body: JSON.stringify({ triageItemId: selectedId })
      });
      setProposal(data.proposal as Proposal);
      setApprovalChecked(false);
      setStatusMessage("Proposal generated. Review JSON and citations before approval.");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not generate proposal");
    } finally {
      setLoading(false);
    }
  }

  async function createIssueDraft() {
    if (!selectedId || !proposal || !approvalChecked) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await authedFetch("/api/admin/triage/issues", {
        method: "POST",
        body: JSON.stringify({
          triageItemId: selectedId,
          proposal,
          approval: {
            approved: true,
            note: approvalNote.trim() || undefined
          }
        })
      });

      setIssueDrafts((prev) => [data.issueDraft as IssueDraft, ...prev]);
      setApprovalChecked(false);
      setApprovalNote("");
      setStatusMessage("Internal issue draft created with human approval.");
      await loadDetail(selectedId);
      await loadItems();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not create issue draft");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    await supabase.auth.signOut();
    setAccessToken(null);
    setItems([]);
    setSelectedId(null);
    setSelectedItem(null);
    setIssueDrafts([]);
    setProposal(null);
    setStatusMessage("Signed out");
    router.push("/admin/login");
    router.refresh();
  }

  if (authChecked && !accessToken) return null;

  return (
    <main className="py-10">
      <Container className="max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl">Bug Triage Admin</h1>
            <p className="text-sm text-slate-700">Proposal-only triage output with explicit human approval before issue draft creation.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void loadItems()} disabled={loading}>
              Refresh
            </Button>
            <Button variant="secondary" onClick={() => router.push("/admin/quiz")}>
              Quiz results
            </Button>
            <Button variant="secondary" onClick={() => void syncSentry()} disabled={loading}>
              Sync Sentry
            </Button>
            <Button variant="secondary" onClick={() => void syncSupportTickets()} disabled={loading}>
              Sync Support Tickets
            </Button>
            <Button variant="secondary" onClick={() => void generateDailyReport()} disabled={loading}>
              Generate Summary
            </Button>
            <Button variant="secondary" onClick={() => void sendDigestEmail()} disabled={loading}>
              Send Digest Email
            </Button>
            <Button variant="secondary" onClick={() => void triggerSentryTestEvent()} disabled={loading}>
              Trigger Sentry Test
            </Button>
            <Button variant="secondary" onClick={() => router.push("/admin/support")}>Support Inbox</Button>
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>

        {statusMessage && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">{statusMessage}</p>}

        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl">Daily Updates</h2>
            <Button variant="secondary" onClick={() => void loadReports()} disabled={loading}>
              Refresh reports
            </Button>
          </div>
          {reports.length === 0 && <p className="text-sm text-slate-700">No daily reports yet. Generate one or wait for scheduled cron.</p>}
          {reports.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold">Latest: {reports[0].report_date}</p>
                <p className="text-xs text-slate-600">
                  Period {formatDateTime(reports[0].period_start)} - {formatDateTime(reports[0].period_end)}
                </p>
                <pre className="mt-2 max-h-[240px] overflow-auto whitespace-pre-wrap rounded bg-slate-900 p-3 text-xs text-slate-100">
                  {reports[0].summary_text}
                </pre>
              </div>
            </div>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="space-y-3">
            <h2 className="text-xl">Triage Items</h2>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Status</span>
                <select className="w-full rounded-lg border border-slate-300 px-2 py-1" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="triaged">Triaged</option>
                  <option value="draft_ready">Draft ready</option>
                  <option value="ignored">Ignored</option>
                  <option value="resolved">Resolved</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Severity</span>
                <select className="w-full rounded-lg border border-slate-300 px-2 py-1" value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}>
                  <option value="all">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </label>
            </div>

            <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
              {items.length === 0 && <p className="text-sm text-slate-700">No triage items found.</p>}
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setProposal(null);
                    setApprovalChecked(false);
                  }}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedId === item.id ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs text-slate-700">
                    {item.source} • {item.severity} • {item.status}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.summary}</p>
                  <p className="mt-1 text-[11px] text-slate-500">Last seen {formatDateTime(item.last_seen_at)}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            {!selectedItem ? (
              <p className="text-sm text-slate-700">Select a triage item to view details.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-2xl">{selectedItem.title}</h2>
                    <p className="text-xs text-slate-700">{selectedSummary}</p>
                    <p className="text-xs text-slate-500">Last seen {formatDateTime(selectedItem.last_seen_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <label className="text-sm">
                      <span className="mr-2">Status</span>
                      <select
                        className="rounded-lg border border-slate-300 px-2 py-1"
                        value={selectedItem.status}
                        onChange={(e) => void updateStatus(e.target.value as TriageItem["status"])}
                      >
                        <option value="open">Open</option>
                        <option value="triaged">Triaged</option>
                        <option value="draft_ready">Draft ready</option>
                        <option value="ignored">Ignored</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-800">{selectedItem.summary}</p>
                  <p className="mt-2 text-xs text-slate-600">
                    Env: {selectedItem.environment || "unknown"} • Release: {selectedItem.release_version || "unknown"}
                  </p>
                  {selectedItem.source_link && (
                    <p className="mt-1 text-xs">
                      <a href={selectedItem.source_link} target="_blank" rel="noreferrer" className="text-brand-700 underline">
                        Source event
                      </a>
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void generateProposal()} disabled={loading}>
                      Generate Proposal JSON
                    </Button>
                  </div>

                  {!proposal && <p className="text-xs text-slate-600">No proposal generated yet. This agent only produces JSON proposals with citations.</p>}

                  {proposal && (
                    <>
                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="text-sm font-semibold">Plain-English Fix Summary</p>
                        <p className="mt-1 text-xs text-slate-700">
                          <span className="font-medium">Problem:</span> {proposal.proposal.plainLanguage.problem}
                        </p>
                        <p className="mt-1 text-xs text-slate-700">
                          <span className="font-medium">User impact:</span> {proposal.proposal.plainLanguage.userImpact}
                        </p>
                        <p className="mt-1 text-xs text-slate-700">
                          <span className="font-medium">Recommended fix:</span> {proposal.proposal.plainLanguage.recommendedFix}
                        </p>
                        <p className="mt-1 text-xs text-slate-700">
                          <span className="font-medium">Expected outcome:</span> {proposal.proposal.plainLanguage.expectedOutcome}
                        </p>
                        <p className="mt-1 text-xs text-slate-700">
                          <span className="font-medium">Tradeoffs:</span> {proposal.proposal.plainLanguage.tradeoffs}
                        </p>
                        <p className="mt-3 text-sm font-semibold">Technical Plan</p>
                        <p className="text-xs text-slate-600">Risk: {proposal.proposal.riskLevel}</p>
                        <p className="text-xs text-slate-600">Confidence: {proposal.proposal.confidence}</p>
                        <p className="text-sm text-slate-800">{proposal.proposal.summary}</p>
                        {proposal.proposal.missingInformation.length > 0 && (
                          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2">
                            <p className="text-xs font-semibold text-amber-900">Missing information</p>
                            <ul className="list-disc pl-5 text-xs text-amber-900">
                              {proposal.proposal.missingInformation.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <summary className="cursor-pointer text-sm font-medium">View strict proposal JSON</summary>
                        <pre className="mt-2 max-h-[320px] overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">{JSON.stringify(proposal, null, 2)}</pre>
                      </details>

                      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
                        <p className="font-semibold">Human approval required</p>
                        <p className="text-xs text-slate-700">Creating an issue draft is blocked until explicit approval is checked.</p>
                        <label className="mt-2 flex items-start gap-2 text-sm">
                          <input type="checkbox" checked={approvalChecked} onChange={(e) => setApprovalChecked(e.target.checked)} />
                          <span>I reviewed this proposal and approve draft creation.</span>
                        </label>
                        <label className="mt-2 block">
                          <span className="text-xs font-medium">Approval note (optional)</span>
                          <textarea
                            className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-1 text-sm"
                            value={approvalNote}
                            onChange={(e) => setApprovalNote(e.target.value)}
                            maxLength={500}
                            rows={3}
                            placeholder="Reason for approval"
                          />
                        </label>
                        <div className="mt-2">
                          <Button onClick={() => void createIssueDraft()} disabled={!approvalChecked || loading}>
                            Create Internal Issue Draft
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg">Draft History</h3>
                  {issueDrafts.length === 0 && <p className="text-sm text-slate-700">No drafts for this triage item yet.</p>}
                  {issueDrafts.map((draft) => (
                    <div key={draft.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold">{draft.draft_title}</p>
                      <p className="text-xs text-slate-600">
                        {draft.status} • approved: {draft.approved ? "yes" : "no"} • created {formatDateTime(draft.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      </Container>
    </main>
  );
}
