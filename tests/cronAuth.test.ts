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

describe("cron auth", () => {
  it("accepts bearer token when TRIAGE_CRON_SECRET matches", async () => {
    seedRequiredEnv();
    process.env.TRIAGE_CRON_SECRET = "secret-123";
    const { isValidCronRequest } = await import("../lib/cronAuth");

    const req = new Request("https://example.com/api/internal/cron/triage-sync", {
      headers: {
        Authorization: "Bearer secret-123"
      }
    });

    const result = isValidCronRequest(req);
    expect(result.ok).toBe(true);
  });

  it("rejects missing token", async () => {
    seedRequiredEnv();
    process.env.TRIAGE_CRON_SECRET = "secret-123";
    const { isValidCronRequest } = await import("../lib/cronAuth");

    const req = new Request("https://example.com/api/internal/cron/triage-sync");
    const result = isValidCronRequest(req);

    expect(result.ok).toBe(false);
  });
});
