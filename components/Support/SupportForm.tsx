"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

type Category = "bug" | "feedback" | "billing" | "other";

function detectBrowserOs() {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;

  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Safari\//.test(ua) && !/Chrome\//.test(ua)
        ? "Safari"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : "Other";

  const os = /Mac OS X/.test(ua)
    ? "macOS"
    : /Windows NT/.test(ua)
      ? "Windows"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad|iPod/.test(ua)
          ? "iOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "Other";

  return `${browser} on ${os}`;
}

function createCorrelationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function SupportForm() {
  const [category, setCategory] = useState<Category>("bug");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  const metadata = useMemo(
    () => ({
      correlationId: createCorrelationId(),
      browserOs: detectBrowserOs(),
      lastRoute: typeof window === "undefined" ? "/support" : window.location.pathname,
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION || "dev"
    }),
    []
  );

  async function submitTicket(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setStatus(null);
    setTicketId(null);

    try {
      const form = new FormData();
      form.append("category", category);
      form.append("subject", subject);
      form.append("description", description);
      if (contactEmail.trim()) form.append("contactEmail", contactEmail.trim());
      form.append("correlationId", metadata.correlationId);
      form.append("browserOs", metadata.browserOs);
      form.append("lastRoute", metadata.lastRoute);
      form.append("appVersion", metadata.appVersion);
      if (screenshot) form.append("screenshot", screenshot);

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const res = await fetch("/api/support/create", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Could not submit support request");
      }

      setTicketId(body.ticketId || null);
      setStatus("Support ticket submitted successfully.");
      setSubject("");
      setDescription("");
      setContactEmail("");
      setScreenshot(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not submit support request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="space-y-4">
      <h1 className="text-4xl">Get Help</h1>
      <p className="text-sm text-[#F2EEE6]/90">Tell us what happened and we will create a support ticket.</p>

      <form className="space-y-4" onSubmit={submitTicket}>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Category</span>
          <select
            className="w-full rounded-xl border border-[#F2EEE6]/25 bg-[#0E0E0E] px-3 py-2 text-[#F2EEE6]"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            <option value="bug">Bug</option>
            <option value="feedback">Feedback</option>
            <option value="billing">Billing</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Subject (optional)</span>
          <input
            className="w-full rounded-xl border border-[#F2EEE6]/25 bg-[#0E0E0E] px-3 py-2 text-[#F2EEE6]"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={160}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Description</span>
          <textarea
            className="w-full rounded-xl border border-[#F2EEE6]/25 bg-[#0E0E0E] px-3 py-2 text-[#F2EEE6]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            maxLength={3000}
            rows={6}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Email (optional, if not logged in)</span>
          <input
            className="w-full rounded-xl border border-[#F2EEE6]/25 bg-[#0E0E0E] px-3 py-2 text-[#F2EEE6]"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            maxLength={160}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Screenshot (optional)</span>
          <input
            className="w-full rounded-xl border border-[#F2EEE6]/25 bg-[#0E0E0E] px-3 py-2 text-[#F2EEE6] file:mr-3 file:rounded-lg file:border-0 file:bg-[#FF2E55] file:px-3 file:py-1.5 file:font-semibold file:text-[#F2EEE6]"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
          />
          <span className="text-xs text-[#F2EEE6]/80">Image only, up to 5MB.</span>
        </label>

        <Button type="submit" disabled={submitting || description.trim().length < 10}>
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </form>

      {status && <p className="text-sm text-[#F2EEE6]">{status}</p>}
      {ticketId && <p className="text-xs text-[#F2EEE6]/88">Ticket ID: {ticketId}</p>}
    </Card>
  );
}
