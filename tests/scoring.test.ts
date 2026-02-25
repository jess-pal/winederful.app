import { describe, expect, it } from "vitest";
import { scoreQuiz } from "../lib/scoring/engine";

const boldAnswers = [
  { questionId: "q1", optionId: "q1_d" },
  { questionId: "q2", optionId: "q2_b" },
  { questionId: "q3", optionId: "q3_d" },
  { questionId: "q4", optionId: "q4_b" },
  { questionId: "q5", optionId: "q5_b" },
  { questionId: "q6", optionId: "q6_c" },
  { questionId: "q7", optionId: "q7_d" },
  { questionId: "q8", optionId: "q8_a" },
  { questionId: "q9", optionId: "q9_d" },
  { questionId: "q10", optionId: "q10_a" }
];

describe("scoreQuiz", () => {
  it("returns deterministic persona output", () => {
    const first = scoreQuiz(boldAnswers);
    const second = scoreQuiz(boldAnswers);

    expect(first.personaId).toBe(second.personaId);
    expect(first.recommendedStyles.length).toBe(3);
    expect(first.explanationBullets.length).toBeGreaterThan(1);
  });

  it("includes top traits", () => {
    const result = scoreQuiz(boldAnswers);
    expect(result.topTraits.length).toBe(3);
    expect(result.topTraits[0].score).toBeGreaterThanOrEqual(result.topTraits[1].score);
  });
});
