import { PERSONAS } from "@/lib/scoring/personas";
import { QUIZ_QUESTIONS } from "@/lib/scoring/questions";
import type { Persona, ScoreResult, Trait } from "@/lib/scoring/types";

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

function personaMatchScore(persona: Persona, traitScores: Record<Trait, number>) {
  let weightedScore = 0;

  for (const [trait, weight] of Object.entries(persona.traitProfile)) {
    weightedScore += traitScores[trait as Trait] * (weight || 0);
  }

  const requiredTraitBonus = Object.entries(persona.requiredTraits).reduce((sum, [trait, threshold]) => {
    return sum + (traitScores[trait as Trait] >= (threshold || 0) ? 4 : 0);
  }, 0);

  return weightedScore + requiredTraitBonus;
}

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

  const matched = PERSONAS.reduce<{ persona: Persona; score: number }>((best, persona) => {
    const nextScore = personaMatchScore(persona, traitScores);

    if (nextScore > best.score) {
      return { persona, score: nextScore };
    }

    if (nextScore === best.score) {
      const bestPrimary = Object.entries(best.persona.traitProfile).reduce((acc, [trait, weight]) => {
        return acc + traitScores[trait as Trait] * (weight || 0);
      }, 0);
      const nextPrimary = Object.entries(persona.traitProfile).reduce((acc, [trait, weight]) => {
        return acc + traitScores[trait as Trait] * (weight || 0);
      }, 0);

      if (nextPrimary > bestPrimary) {
        return { persona, score: nextScore };
      }
    }

    return best;
  }, { persona: PERSONAS[0], score: Number.NEGATIVE_INFINITY }).persona;

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
