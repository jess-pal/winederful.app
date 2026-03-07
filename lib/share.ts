import { z } from "zod";

const shareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{10,128}$/);

const shareResultSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(300),
  recommendedStyles: z.array(z.string().min(1).max(80)).length(3),
  explanationBullets: z.array(z.string().min(1).max(300)).max(5)
});

export type ShareResult = z.infer<typeof shareResultSchema>;

export async function resolveSharedResult(token: string): Promise<{ sessionId: string; result: ShareResult } | null> {
  const safeToken = shareTokenSchema.safeParse(token);
  if (!safeToken.success) {
    return null;
  }

  const { db } = await import("@/lib/db");

  const { data, error } = await db
    .from("quiz_sessions")
    .select("id, result_payload")
    .eq("public_share_token", safeToken.data)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const parsed = shareResultSchema.safeParse(data.result_payload);
  if (!parsed.success) {
    return null;
  }

  return {
    sessionId: data.id,
    result: parsed.data
  };
}
