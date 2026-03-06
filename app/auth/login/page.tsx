"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const supabase = getSupabaseBrowserClient();

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters")
});

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message || "Invalid login details");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password
    });

    if (error) {
      setMessage("Could not log in. Check your credentials and try again.");
      setLoading(false);
      return;
    }

    router.push("/quiz");
    router.refresh();
    setLoading(false);
  }

  return (
    <main className="py-12">
      <Container className="max-w-xl">
        <Card className="space-y-4">
          <h1 className="text-3xl">Log in</h1>
          <p className="text-sm text-slate-700">Jump back into the wine persona quiz.</p>

          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Email</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                autoComplete="email"
                required
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">Password</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="current-password"
                required
                minLength={8}
              />
            </label>

            <Button type="submit" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>

          {message && <p className="text-sm text-brand-900">{message}</p>}

          <p className="text-sm text-slate-700">
            New here? <Link className="underline" href="/auth/signup">Create account</Link>
          </p>
        </Card>
      </Container>
    </main>
  );
}
