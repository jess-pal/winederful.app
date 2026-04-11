"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginFallback />}>
      <AdminLoginContent />
    </Suspense>
  );
}

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/admin/support";
  const authCode = searchParams.get("code");
  const authError = useMemo(
    () => searchParams.get("error_description") || searchParams.get("error") || null,
    [searchParams]
  );

  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [hasVerified, setHasVerified] = useState(false);
  const [isExchangingCode, setIsExchangingCode] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      setAccessToken(data.session?.access_token || null);
      if (data.session?.user?.email) {
        setEmail(data.session.user.email);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token || null);
      if (session?.user?.email) {
        setEmail(session.user.email);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    let mutated = false;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

    if (hashParams.get("error_description") || hashParams.get("error")) {
      const hashError = hashParams.get("error_description") || hashParams.get("error") || "Could not complete magic link sign-in";
      setMessage(decodeURIComponent(hashError).replace(/\+/g, " "));
      url.hash = "";
      mutated = true;
    }

    ["code", "type", "error", "error_code", "error_description"].forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        mutated = true;
      }
    });

    if (mutated) {
      const next = searchParams.get("next");
      const cleanUrl = `${url.pathname}${next ? `?next=${encodeURIComponent(next)}` : ""}`;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!accessToken || !window.location.hash.includes("access_token")) return;

    const next = searchParams.get("next");
    const cleanUrl = `${window.location.pathname}${next ? `?next=${encodeURIComponent(next)}` : ""}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }, [accessToken, searchParams]);

  const verifyAdminAccess = useCallback(async () => {
    if (!accessToken) {
      setMessage("No active session yet. Open the magic link first.");
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || "Could not verify admin access");
      }

      router.push(nextPath);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not verify admin access");
    } finally {
      setLoading(false);
    }
  }, [accessToken, nextPath, router]);

  useEffect(() => {
    if (!authCode || accessToken || isExchangingCode) return;

    setIsExchangingCode(true);
    setLoading(true);
    setMessage("Magic link confirmed. Signing you in...");

    void (async () => {
      try {
        const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
        if (error) throw error;
        setAccessToken(data.session?.access_token || null);
        if (data.session?.user?.email) {
          setEmail(data.session.user.email);
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not complete magic link sign-in");
      } finally {
        setLoading(false);
      }
    })();
  }, [accessToken, authCode, isExchangingCode]);

  useEffect(() => {
    if (!authError) return;
    setMessage(decodeURIComponent(authError).replace(/\+/g, " "));
  }, [authError]);

  useEffect(() => {
    if (!accessToken || hasVerified) return;

    setHasVerified(true);
    setMessage("Magic link confirmed. Verifying admin access...");
    void verifyAdminAccess();
  }, [accessToken, hasVerified, verifyAdminAccess]);

  async function sendMagicLink() {
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/admin/login?next=${encodeURIComponent(nextPath)}`
      }
    });

    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Magic link sent. Opening it should sign you in automatically.");
  }

  return (
    <main className="py-12">
      <Container className="max-w-xl">
        <Card className="space-y-4 !bg-[#111111] !text-[#F2EEE6]">
          <h1 className="text-3xl text-[#F2EEE6]">Admin Login</h1>
          <p className="text-sm text-[#F2EEE6]/78">Step 1: sign in with your allowlisted admin email. Step 2: we verify admin access automatically once the magic link lands.</p>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-[#F2EEE6]">Email</span>
            <input className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-slate-950" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={sendMagicLink} disabled={loading || !email.includes("@")}>
              {loading ? "Sending..." : "Send magic link"}
            </Button>
            <Button onClick={verifyAdminAccess} disabled={loading || !accessToken} variant="secondary">
              Verify admin access
            </Button>
          </div>

          <p className="text-xs text-[#F2EEE6]/62">Admin access expires automatically after 20 minutes and must be re-verified.</p>
          {message && <p className="rounded-xl border border-[#ff2e55]/35 bg-[#ff2e55]/12 px-3 py-2 text-sm text-[#F8DCE3]">{message}</p>}
        </Card>
      </Container>
    </main>
  );
}

function AdminLoginFallback() {
  return (
    <main className="py-12">
      <Container className="max-w-xl">
        <Card className="!bg-[#111111] !text-[#F2EEE6]">
          <p className="text-sm text-[#F2EEE6]/78">Loading admin login...</p>
        </Card>
      </Container>
    </main>
  );
}
