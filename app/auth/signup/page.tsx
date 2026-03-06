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

const signUpSchema = z
  .object({
    username: z.string().min(2, "Username must be at least 2 characters").max(40, "Username is too long"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
    confirmPassword: z.string()
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"]
  });

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const parsed = signUpSchema.safeParse({ username, email, password, confirmPassword });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message || "Invalid sign up details");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          display_name: parsed.data.username.trim()
        },
        emailRedirectTo: `${window.location.origin}/quiz`
      }
    });

    if (error) {
      setMessage("Could not create account. Please try again.");
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/quiz");
      router.refresh();
      setLoading(false);
      return;
    }

    setMessage("Account created. Check your email to confirm, then log in.");
    setLoading(false);
  }

  return (
    <main className="py-12">
      <Container className="max-w-xl">
        <Card className="space-y-4">
          <h1 className="text-3xl">Create account</h1>
          <p className="text-sm text-slate-700">Create an account to save your wine persona results.</p>

          <form className="space-y-4" onSubmit={handleSignup}>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Username</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                type="text"
                autoComplete="nickname"
                required
                minLength={2}
                maxLength={40}
              />
            </label>

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
              <span className="text-xs text-slate-600">Used only for account authentication and recovery.</span>
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">Password</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium">Confirm password</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </label>

            <Button type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          {message && <p className="text-sm text-brand-900">{message}</p>}

          <p className="text-sm text-slate-700">
            Already have an account? <Link className="underline" href="/auth/login">Log in</Link>
          </p>
        </Card>
      </Container>
    </main>
  );
}
