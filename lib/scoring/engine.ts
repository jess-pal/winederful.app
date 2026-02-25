import { PERSONAS } from "@/lib/scoring/personas";
import { QUIZ_QUESTIONS } from "@/lib/scoring/questions";
import type { ScoreResult, Trait } from "@/lib/scoring/types";

const TRAIT_LABELS: Record<Trait, string> = {
  bold: "bold flavor",
  classic: "classic taste",
  adventurous: "curiosity",
  social: "social energy",
  sweet: "fruit-forward preference",
  budget: "value focus",
  crisp: "crisp freshness",
  cozy: "comfort"
};

export function scoreQuiz(answers: Array<{ questionId: string; optionId: string }>): ScoreResult {
  const traitScores: Record<Trait, number> = {
    bold: 0,
    classic: 0,
    adventurous: 0,
    social: 0,
    sweet: 0,
    budget: 0,
    crisp: 0,
    cozy: 0
  };

  for (const answer of answers) {
    const question = QUIZ_QUESTIONS.find((q) => q.id === answer.questionId);
    if (!question) continue;
    const option = question.options.find((o) => o.id === answer.optionId);
    if (!option) continue;

    for (const [trait, points] of Object.entries(option.traits)) {
      traitScores[trait as Trait] += points || 0;
    }
  }

  const sortedTraits = Object.entries(traitScores)
    .map(([trait, score]) => ({ trait: trait as Trait, score }))
    .sort((a, b) => b.score - a.score);

  const matched =
    PERSONAS.find((persona) =>
      Object.entries(persona.requiredTraits).every(([trait, threshold]) => traitScores[trait as Trait] >= (threshold || 0))
    ) || PERSONAS[0];

  const topTraits = sortedTraits.slice(0, 3);

  return {
    personaId: matched.personaId,
    title: matched.title,
    description: matched.description,
    recommendedStyles: matched.recommendedStyles,
    topTraits,
    explanationBullets: [
      ...matched.explanationTemplate,
      `Top traits: ${topTraits.map((t) => TRAIT_LABELS[t.trait]).join(", ")}.`
    ]
  };
}
