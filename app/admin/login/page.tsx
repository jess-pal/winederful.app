"use client";

import { Suspense, useEffect, useState } from "react";
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

  const [email, setEmail] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    setMessage("Magic link sent. Open it, then click Verify admin access.");
  }

  async function verifyAdminAccess() {
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
  }

  return (
    <main className="py-12">
      <Container className="max-w-xl">
        <Card className="space-y-4">
          <h1 className="text-3xl">Admin Login</h1>
          <p className="text-sm text-slate-700">Step 1: Sign in with your allowlisted admin email. Step 2: verify admin access.</p>

          <label className="block space-y-1">
            <span className="text-sm font-medium">Email</span>
            <input className="w-full rounded-xl border border-slate-300 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={sendMagicLink} disabled={loading || !email.includes("@")}>
              {loading ? "Sending..." : "Send magic link"}
            </Button>
            <Button onClick={verifyAdminAccess} disabled={loading || !accessToken} variant="secondary">
              Verify admin access
            </Button>
          </div>

          <p className="text-xs text-slate-600">Admin access expires automatically after 20 minutes and must be re-verified.</p>
          {message && <p className="text-sm text-brand-900">{message}</p>}
        </Card>
      </Container>
    </main>
  );
}

function AdminLoginFallback() {
  return (
    <main className="py-12">
      <Container className="max-w-xl">
        <Card>
          <p className="text-sm text-slate-700">Loading admin login...</p>
        </Card>
      </Container>
    </main>
  );
}
