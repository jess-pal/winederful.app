import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_APP_VERSION: z.string().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SENTRY_DSN: z.string().url().optional().or(z.literal("")),
  SENTRY_AUTH_TOKEN: z.string().optional().or(z.literal("")),
  SENTRY_ORG_SLUG: z.string().optional().or(z.literal("")),
  SENTRY_PROJECT_SLUG: z.string().optional().or(z.literal("")),
  CRON_SECRET: z.string().optional().or(z.literal("")),
  TRIAGE_CRON_SECRET: z.string().optional().or(z.literal("")),
  RESEND_API_KEY: z.string().optional().or(z.literal("")),
  TRIAGE_EMAIL_TO: z.string().email().optional().or(z.literal("")),
  TRIAGE_EMAIL_FROM: z.string().email().optional().or(z.literal("")),
  ADMIN_ALLOWLIST: z.string().default(""),
  RATE_LIMIT_PROVIDER: z.enum(["db", "upstash"]).default("db"),
  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal("")),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional().or(z.literal("")),
  IP_HASH_SALT: z.string().min(16),
  ADMIN_SESSION_SECRET: z.string().min(32)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${issues}`);
}

export const env = parsed.data;
