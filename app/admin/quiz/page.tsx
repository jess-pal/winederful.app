"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";
import { PERSONAS } from "@/lib/scoring/personas";
import { QUIZ_QUESTIONS } from "@/lib/scoring/questions";

type QuizAnswer = {
  question_id: string;
  option_id: string;
};

type QuizResultPayload = {
  title?: string;
  description?: string;
  recommendedStyles?: string[];
  explanationBullets?: string[];
};

type QuizSession = {
  id: string;
  created_at: string;
  result_persona: string;
  result_payload: QuizResultPayload;
  answers_payload: QuizAnswer[] | null;
  public_share_token: string;
};

const supabase = getSupabaseBrowserClient();

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

const personaLabelById = new Map(PERSONAS.map((p) => [p.personaId, p.title]));
const questionById = new Map(QUIZ_QUESTIONS.map((q) => [q.id, q]));

export default function AdminQuizResultsPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [filterPersona, setFilterPersona] = useState("all");
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const PAGE_SIZE = 40;

  const selectedSession = useMemo(() => sessions.find((s) => s.id === selectedSessionId) || null, [sessions, selectedSessionId]);

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

  const loadSessions = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const params = new URLSearchParams();
      if (filterPersona !== "all") {
        params.set("persona", filterPersona);
      }
      params.set("limit", String(PAGE_SIZE));
      params.set("page", String(page));

      const data = await authedFetch(`/api/admin/quiz/sessions?${params.toString()}`, { method: "GET" });
      const nextSessions = (data.sessions || []) as QuizSession[];
      setSessions(nextSessions);
      setHasMore(Boolean(data.hasMore));

      if (!nextSessions.length) {
        setSelectedSessionId(null);
        return;
      }

      if (!selectedSessionId || !nextSessions.some((s) => s.id === selectedSessionId)) {
        setSelectedSessionId(nextSessions[0].id);
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not load quiz sessions");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authedFetch, filterPersona, page, selectedSessionId]);

  useEffect(() => {
    setPage(1);
  }, [filterPersona]);

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
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (authChecked && !accessToken) {
      router.push("/admin/login?next=/admin/quiz");
    }
  }, [accessToken, authChecked, router]);

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    await supabase.auth.signOut();
    setAccessToken(null);
    setSessions([]);
    setSelectedSessionId(null);
    setStatusMessage("Signed out");
    router.push("/admin/login");
    router.refresh();
  }

  if (authChecked && !accessToken) {
    return null;
  }

  return (
    <main className="py-10">
      <Container className="max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl">Quiz Results Admin</h1>
            <p className="text-sm text-slate-700">Review each submitted quiz persona and answer pattern.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => void loadSessions()} disabled={loading}>
              Refresh
            </Button>
            <Button variant="secondary" onClick={() => router.push("/admin/support")}>
              Support
            </Button>
            <Button variant="secondary" onClick={() => router.push("/admin/triage")}>
              Bug triage
            </Button>
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>

        {statusMessage && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">{statusMessage}</p>}

        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xl">Submissions ({sessions.length})</h2>
              <select
                className="rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm"
                value={filterPersona}
                onChange={(event) => setFilterPersona(event.target.value)}
              >
                <option value="all">All personas</option>
                {PERSONAS.map((persona) => (
                  <option key={persona.personaId} value={persona.personaId}>
                    {persona.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-600">Page {page}</p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setPage((v) => Math.max(1, v - 1))} disabled={loading || page === 1}>
                  Previous
                </Button>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setPage((v) => v + 1)} disabled={loading || !hasMore}>
                  Next
                </Button>
              </div>
            </div>

            <div className="max-h-[68vh] space-y-2 overflow-auto pr-1">
              {sessions.length === 0 ? (
                <p className="text-sm text-slate-600">{loading ? "Loading..." : "No quiz sessions found for this filter."}</p>
              ) : (
                sessions.map((session) => {
                  const active = session.id === selectedSessionId;
                  const title = session.result_payload?.title || personaLabelById.get(session.result_persona) || session.result_persona;

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        active ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">{title}</p>
                      <p className="text-xs text-slate-600">{formatDateTime(session.created_at)}</p>
                      <p className="mt-1 text-xs text-slate-500">Session: {session.id.slice(0, 8)}...</p>
                    </button>
                  );
                })
              )}
            </div>
          </Card>

          <Card className="space-y-4">
            {!selectedSession ? (
              <p className="text-sm text-slate-600">Select a quiz submission to see full details.</p>
            ) : (
              <>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold text-slate-900">
                    {selectedSession.result_payload?.title || personaLabelById.get(selectedSession.result_persona) || selectedSession.result_persona}
                  </h2>
                  <p className="text-sm text-slate-600">{formatDateTime(selectedSession.created_at)}</p>
                  <p className="text-xs text-slate-500">Session ID: {selectedSession.id}</p>
                  <p className="text-xs text-slate-500">Persona key: {selectedSession.result_persona}</p>
                </div>

                {selectedSession.result_payload?.description && <p className="text-sm text-slate-800">{selectedSession.result_payload.description}</p>}

                {selectedSession.result_payload?.recommendedStyles?.length ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Recommended styles</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedSession.result_payload.recommendedStyles.map((style) => (
                        <span key={style} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {selectedSession.answers_payload?.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Submitted answers</p>
                    <div className="space-y-2">
                      {selectedSession.answers_payload.map((answer, idx) => {
                        const question = questionById.get(answer.question_id);
                        const optionLabel = question?.options.find((option) => option.id === answer.option_id)?.label;
                        return (
                          <div key={`${answer.question_id}-${answer.option_id}-${idx}`} className="rounded-lg border border-slate-200 px-3 py-2">
                            <p className="text-sm font-medium text-slate-900">{question?.prompt || answer.question_id}</p>
                            <p className="mt-0.5 text-sm text-slate-700">{optionLabel || answer.option_id}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">No answer payload stored for this session.</p>
                )}

                <div className="pt-1">
                  <a
                    className="inline-flex rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
                    href={`/share/${selectedSession.public_share_token}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open public share page
                  </a>
                </div>
              </>
            )}
          </Card>
        </div>
      </Container>
    </main>
  );
}
