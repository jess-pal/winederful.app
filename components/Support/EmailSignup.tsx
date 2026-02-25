"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export function EmailSignup() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");

    const response = await fetch("/api/email/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        marketingOptIn: consent,
        consentVersion: "v1",
        source: "landing"
      })
    });

    if (response.ok) {
      setStatus("success");
      setEmail("");
      setConsent(false);
      return;
    }

    setStatus("error");
  };

  return (
    <Card id="email-signup" className="mt-10 space-y-4">
      <h2 className="text-2xl">Get weekly wine deals</h2>
      <p className="text-slate-700">Only occasional updates. You can unsubscribe later.</p>
      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input checked={consent} onChange={(e) => setConsent(e.target.checked)} required type="checkbox" />
          <span>I agree to receive marketing emails from Wine Persona.</span>
        </label>

        <Button disabled={status === "loading"} type="submit">
          {status === "loading" ? "Saving..." : "Join list"}
        </Button>
      </form>

      {status === "success" && <p className="text-sm text-brand-700">You are subscribed.</p>}
      {status === "error" && <p className="text-sm text-red-700">Could not subscribe. Please try again.</p>}
    </Card>
  );
}
