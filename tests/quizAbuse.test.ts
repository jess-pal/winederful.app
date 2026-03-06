import { describe, expect, it } from "vitest";
import { evaluateQuizSubmissionGuard } from "../lib/quizAbuse";

describe("evaluateQuizSubmissionGuard", () => {
  it("allows normal traffic", () => {
    const result = evaluateQuizSubmissionGuard({
      inLast10Min: 2,
      inLast10MinSameUa: 1,
      inLastDay: 8,
      lastSubmissionAtMs: null
    });

    expect(result).toEqual({ allowed: true });
  });

  it("blocks bursts from the same IP", () => {
    const result = evaluateQuizSubmissionGuard({
      inLast10Min: 20,
      inLast10MinSameUa: 6,
      inLastDay: 30,
      lastSubmissionAtMs: null
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("ip_burst_limit");
  });

  it("blocks bursts from the same IP+UA", () => {
    const result = evaluateQuizSubmissionGuard({
      inLast10Min: 8,
      inLast10MinSameUa: 12,
      inLastDay: 20,
      lastSubmissionAtMs: null
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("ip_ua_burst_limit");
  });

  it("blocks extremely frequent consecutive submits", () => {
    const nowMs = Date.now();
    const result = evaluateQuizSubmissionGuard(
      {
        inLast10Min: 1,
        inLast10MinSameUa: 1,
        inLastDay: 1,
        lastSubmissionAtMs: nowMs - 500
      },
      nowMs
    );

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("too_frequent");
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("blocks excessive daily volume", () => {
    const result = evaluateQuizSubmissionGuard({
      inLast10Min: 3,
      inLast10MinSameUa: 2,
      inLastDay: 120,
      lastSubmissionAtMs: null
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("daily_limit");
  });
});
