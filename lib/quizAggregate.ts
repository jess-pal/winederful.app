import { db } from "@/lib/db";
import { PERSONAS } from "@/lib/scoring/personas";

type PersonaAggregate = {
  personaId: string;
  title: string;
  count: number;
  percentage: number;
};

export type QuizAggregate = {
  totalAssessments: number;
  topPersonas: PersonaAggregate[];
};

const personaTitles = new Map(PERSONAS.map((persona) => [persona.personaId, persona.title]));

export async function getQuizAggregate(limit = 4): Promise<QuizAggregate> {
  const { data, error } = await db.from("quiz_sessions").select("result_persona");

  if (error) {
    throw new Error(error.message || "Could not load quiz aggregate");
  }

  const rows = data || [];
  const totalAssessments = rows.length;

  if (!totalAssessments) {
    return {
      totalAssessments: 0,
      topPersonas: []
    };
  }

  const counts = new Map<string, number>();

  for (const row of rows) {
    const personaId = row.result_persona;
    if (!personaId) {
      continue;
    }
    counts.set(personaId, (counts.get(personaId) || 0) + 1);
  }

  const topPersonas = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, Math.max(1, limit))
    .map(([personaId, count]) => {
      const percentage = Number(((count / totalAssessments) * 100).toFixed(1));
      return {
        personaId,
        title: personaTitles.get(personaId) || personaId,
        count,
        percentage
      };
    });

  return {
    totalAssessments,
    topPersonas
  };
}
