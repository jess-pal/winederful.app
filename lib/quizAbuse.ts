const TEN_MINUTES_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_SUBMIT_INTERVAL_MS = 2_000;
const MAX_PER_10_MIN = 20;
const MAX_PER_10_MIN_PER_UA = 12;
const MAX_PER_DAY = 120;

type SubmissionVolume = {
  inLast10Min: number;
  inLast10MinSameUa: number;
  inLastDay: number;
  lastSubmissionAtMs: number | null;
};

export type QuizSubmitGuardResult = {
  allowed: boolean;
  reason?: "too_frequent" | "ip_burst_limit" | "ip_ua_burst_limit" | "daily_limit";
  retryAfterMs?: number;
};

export function evaluateQuizSubmissionGuard(volume: SubmissionVolume, nowMs = Date.now()): QuizSubmitGuardResult {
  if (volume.lastSubmissionAtMs) {
    const elapsed = nowMs - volume.lastSubmissionAtMs;
    if (elapsed >= 0 && elapsed < MIN_SUBMIT_INTERVAL_MS) {
      return {
        allowed: false,
        reason: "too_frequent",
        retryAfterMs: MIN_SUBMIT_INTERVAL_MS - elapsed
      };
    }
  }

  if (volume.inLast10Min >= MAX_PER_10_MIN) {
    return {
      allowed: false,
      reason: "ip_burst_limit",
      retryAfterMs: TEN_MINUTES_MS
    };
  }

  if (volume.inLast10MinSameUa >= MAX_PER_10_MIN_PER_UA) {
    return {
      allowed: false,
      reason: "ip_ua_burst_limit",
      retryAfterMs: TEN_MINUTES_MS
    };
  }

  if (volume.inLastDay >= MAX_PER_DAY) {
    return {
      allowed: false,
      reason: "daily_limit",
      retryAfterMs: DAY_MS
    };
  }

  return { allowed: true };
}

export async function guardQuizSubmission(ipHash: string, uaHash: string, now = new Date()): Promise<QuizSubmitGuardResult> {
  const { db } = await import("@/lib/db");
  const nowMs = now.getTime();
  const since10MinIso = new Date(nowMs - TEN_MINUTES_MS).toISOString();
  const sinceDayIso = new Date(nowMs - DAY_MS).toISOString();

  const [burstCountRes, burstUaCountRes, dailyCountRes, latestRes] = await Promise.all([
    db.from("quiz_sessions").select("*", { head: true, count: "exact" }).eq("ip_hash", ipHash).gte("created_at", since10MinIso),
    db
      .from("quiz_sessions")
      .select("*", { head: true, count: "exact" })
      .eq("ip_hash", ipHash)
      .eq("user_agent_hash", uaHash)
      .gte("created_at", since10MinIso),
    db.from("quiz_sessions").select("*", { head: true, count: "exact" }).eq("ip_hash", ipHash).gte("created_at", sinceDayIso),
    db.from("quiz_sessions").select("created_at").eq("ip_hash", ipHash).order("created_at", { ascending: false }).limit(1)
  ]);

  if (burstCountRes.error) {
    throw new Error(burstCountRes.error.message || "Could not load 10-minute quiz submission count");
  }
  if (burstUaCountRes.error) {
    throw new Error(burstUaCountRes.error.message || "Could not load 10-minute quiz submission UA count");
  }
  if (dailyCountRes.error) {
    throw new Error(dailyCountRes.error.message || "Could not load daily quiz submission count");
  }
  if (latestRes.error) {
    throw new Error(latestRes.error.message || "Could not load latest quiz submission timestamp");
  }

  const latestCreatedAt = latestRes.data?.[0]?.created_at;

  return evaluateQuizSubmissionGuard(
    {
      inLast10Min: burstCountRes.count || 0,
      inLast10MinSameUa: burstUaCountRes.count || 0,
      inLastDay: dailyCountRes.count || 0,
      lastSubmissionAtMs: latestCreatedAt ? new Date(latestCreatedAt).getTime() : null
    },
    nowMs
  );
}
