"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

type SupportTicket = {
  id: string;
  created_at: string;
  updated_at: string;
  status: "open" | "pending" | "resolved" | "closed";
  priority: "low" | "medium" | "high";
  user_id: string | null;
  subject: string | null;
  description: string;
  category: "bug" | "feedback" | "billing" | "other";
  metadata: Record<string, unknown>;
};

type SupportMessage = {
  id: string;
  created_at: string;
  sender_type: "user" | "agent" | "admin";
  message: string;
  metadata: Record<string, unknown>;
};

type SupportAttachment = {
  id: string;
  created_at: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  signed_url: string | null;
};

const supabase = getSupabaseBrowserClient();

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

export default function AdminSupportPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [attachments, setAttachments] = useState<SupportAttachment[]>([]);

  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [replyText, setReplyText] = useState("");

  const selectedSummary = useMemo(() => {
    if (!selectedTicket) return "";
    return `${selectedTicket.category} • ${selectedTicket.status} • ${selectedTicket.priority}`;
  }, [selectedTicket]);

  const authedFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      if (!accessToken) {
        throw new Error("No active session");
      }

      const isFormData = init.body instanceof FormData;
      const res = await fetch(path, {
        ...init,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(init.headers || {})
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      return data;
    },
    [accessToken]
  );

  const loadTickets = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterCategory !== "all") params.set("category", filterCategory);

      const data = await authedFetch(`/api/admin/support/tickets?${params.toString()}`, { method: "GET" });
      const nextTickets = (data.tickets || []) as SupportTicket[];
      setTickets(nextTickets);

      if (nextTickets.length === 0) {
        setSelectedTicketId(null);
        setSelectedTicket(null);
        setMessages([]);
        setAttachments([]);
        return;
      }

      const fallbackId = nextTickets[0].id;
      const nextSelectedId = nextTickets.some((t) => t.id === selectedTicketId) ? selectedTicketId : fallbackId;
      if (nextSelectedId) {
        setSelectedTicketId(nextSelectedId);
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not load support tickets");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authedFetch, filterCategory, filterStatus, selectedTicketId]);

  const loadTicketDetail = useCallback(
    async (ticketId: string) => {
      if (!accessToken) return;

      setLoading(true);
      setStatusMessage(null);
      try {
        const data = await authedFetch(`/api/admin/support/tickets/${ticketId}`, { method: "GET" });
        setSelectedTicket(data.ticket || null);
        setMessages((data.messages || []) as SupportMessage[]);
        setAttachments((data.attachments || []) as SupportAttachment[]);
      } catch (error) {
        setStatusMessage(error instanceof Error ? error.message : "Could not load ticket details");
      } finally {
        setLoading(false);
      }
    },
    [accessToken, authedFetch]
  );

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
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (selectedTicketId) {
      void loadTicketDetail(selectedTicketId);
    }
  }, [selectedTicketId, loadTicketDetail]);

  useEffect(() => {
    if (authChecked && !accessToken) {
      router.push("/admin/login?next=/admin/support");
    }
  }, [accessToken, authChecked, router]);

  async function signOut() {
    await fetch("/api/admin/session", { method: "DELETE" });
    await supabase.auth.signOut();
    setAccessToken(null);
    setTickets([]);
    setSelectedTicketId(null);
    setSelectedTicket(null);
    setMessages([]);
    setAttachments([]);
    setReplyText("");
    setStatusMessage("Signed out");
    router.push("/admin/login");
    router.refresh();
  }

  async function updateTicket(patch: { status?: SupportTicket["status"]; priority?: SupportTicket["priority"] }) {
    if (!selectedTicketId) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await authedFetch(`/api/admin/support/tickets/${selectedTicketId}`, {
        method: "PATCH",
        body: JSON.stringify(patch)
      });

      const updated = data.ticket as Pick<SupportTicket, "id" | "status" | "priority" | "updated_at">;
      setSelectedTicket((prev) =>
        prev && prev.id === updated.id
          ? {
              ...prev,
              status: updated.status,
              priority: updated.priority,
              updated_at: updated.updated_at
            }
          : prev
      );
      setTickets((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      setStatusMessage("Ticket updated");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not update ticket");
    } finally {
      setLoading(false);
    }
  }

  async function sendReply() {
    if (!selectedTicketId || replyText.trim().length < 2) return;

    setLoading(true);
    setStatusMessage(null);
    try {
      const data = await authedFetch("/api/admin/support/reply", {
        method: "POST",
        body: JSON.stringify({ ticketId: selectedTicketId, message: replyText.trim() })
      });

      const newMessage = data.message as SupportMessage;
      setMessages((prev) => [...prev, newMessage]);
      setSelectedTicket((prev) => (prev ? { ...prev, status: "pending" } : prev));
      setTickets((prev) => prev.map((item) => (item.id === selectedTicketId ? { ...item, status: "pending" } : item)));
      setReplyText("");
      setStatusMessage("Reply saved");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Could not save reply");
    } finally {
      setLoading(false);
    }
  }

  if (authChecked && !accessToken) {
    return null;
  }

  return (
    <main className="py-10">
      <Container className="max-w-7xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-4xl">Support Admin</h1>
            <p className="text-sm text-[#F2EEE6]/78">Review tickets, update status, and store reply drafts.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void loadTickets()} disabled={loading}>
              Refresh
            </Button>
            <Button variant="secondary" onClick={() => router.push("/admin/overview")}>
              Overview
            </Button>
            <Button variant="secondary" onClick={() => router.push("/admin/quiz")}>
              Quiz analytics
            </Button>
            <Button variant="secondary" onClick={() => router.push("/admin/triage")}>
              Bug triage
            </Button>
            <Button variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>

        {statusMessage && <p className="rounded-xl border border-[#ff2e55]/35 bg-[#ff2e55]/12 px-3 py-2 text-sm text-[#F8DCE3]">{statusMessage}</p>}

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="space-y-3 !bg-white !text-slate-900">
            <h2 className="text-xl">Tickets</h2>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1 text-sm">
                <span className="font-medium">Status</span>
                <select className="w-full rounded-lg border border-slate-300 px-2 py-1" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">All</option>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Category</span>
                <select className="w-full rounded-lg border border-slate-300 px-2 py-1" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                  <option value="all">All</option>
                  <option value="bug">Bug</option>
                  <option value="feedback">Feedback</option>
                  <option value="billing">Billing</option>
                  <option value="other">Other</option>
                </select>
              </label>
            </div>

            <div className="max-h-[70vh] space-y-2 overflow-auto pr-1">
              {tickets.length === 0 && <p className="text-sm text-slate-700">No tickets found.</p>}
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    selectedTicketId === ticket.id ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:border-brand-300"
                  }`}
                >
                  <p className="text-sm font-semibold">{ticket.subject?.trim() || "No subject"}</p>
                  <p className="mt-1 text-xs text-slate-700">{ticket.category} • {ticket.status} • {ticket.priority}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{ticket.description}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(ticket.created_at)}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 !bg-white !text-slate-900">
            {!selectedTicket ? (
              <p className="text-sm text-slate-700">Select a ticket to view details.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-2xl">{selectedTicket.subject?.trim() || "No subject"}</h2>
                    <p className="text-xs text-slate-700">{selectedSummary}</p>
                    <p className="text-xs text-slate-500">Created {formatDateTime(selectedTicket.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    <label className="text-sm">
                      <span className="mr-2">Status</span>
                      <select
                        className="rounded-lg border border-slate-300 px-2 py-1"
                        value={selectedTicket.status}
                        onChange={(e) => void updateTicket({ status: e.target.value as SupportTicket["status"] })}
                      >
                        <option value="open">Open</option>
                        <option value="pending">Pending</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mr-2">Priority</span>
                      <select
                        className="rounded-lg border border-slate-300 px-2 py-1"
                        value={selectedTicket.priority}
                        onChange={(e) => void updateTicket({ priority: e.target.value as SupportTicket["priority"] })}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-slate-900">{selectedTicket.description}</p>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Attachments</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="rounded-lg border border-slate-200 bg-white p-2">
                          {attachment.signed_url ? (
                            <a className="text-xs font-medium text-brand-700 underline" href={attachment.signed_url} target="_blank" rel="noreferrer">
                              Open screenshot
                            </a>
                          ) : (
                            <p className="text-xs text-slate-700">Signed URL unavailable</p>
                          )}
                          <p className="mt-1 text-[11px] text-slate-500">{attachment.mime_type} • {Math.round(attachment.size_bytes / 1024)}KB</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Conversation</h3>
                  <div className="max-h-72 space-y-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3">
                    {messages.length === 0 && <p className="text-xs text-slate-600">No messages yet.</p>}
                    {messages.map((msg) => (
                      <div key={msg.id} className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">{msg.sender_type}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-900">{msg.message}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(msg.created_at)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block space-y-1">
                    <span className="text-sm font-medium">Admin reply draft</span>
                    <textarea
                      className="w-full rounded-xl border border-slate-300 px-3 py-2"
                      rows={4}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      maxLength={3000}
                    />
                  </label>
                  <Button onClick={sendReply} disabled={loading || replyText.trim().length < 2}>
                    Save reply
                  </Button>
                  <p className="text-xs text-slate-600">Replies are stored internally only. Email sending is not enabled yet.</p>
                </div>
              </>
            )}
          </Card>
        </div>
      </Container>
    </main>
  );
}
