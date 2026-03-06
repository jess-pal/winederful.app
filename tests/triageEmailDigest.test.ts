import { afterEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

function seedRequiredEnv() {
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "anon";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service";
  process.env.IP_HASH_SALT = "1234567890123456";
  process.env.ADMIN_SESSION_SECRET = "12345678901234567890123456789012";
  process.env.ADMIN_ALLOWLIST = "admin@example.com";
  process.env.RATE_LIMIT_PROVIDER = "db";
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("triageEmailDigest", () => {
  it("builds digest subject and body", async () => {
    seedRequiredEnv();
    const { buildDigestEmail } = await import("../lib/triageEmailDigest");

    const digest = buildDigestEmail({
      id: "123",
      report_date: "2026-02-28",
      period_start: "2026-02-27T00:00:00.000Z",
      period_end: "2026-02-28T00:00:00.000Z",
      summary_text: "Daily bug triage summary content",
      report_payload: {
        recommendations: ["Add regression test", "Improve input validation"]
      }
    });

    expect(digest.subject).toContain("2026-02-28");
    expect(digest.text).toContain("Daily bug triage summary content");
    expect(digest.html).toContain("Add regression test");
  });
});
