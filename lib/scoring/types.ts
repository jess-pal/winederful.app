export type Trait =
  | "bold"
  | "classic"
  | "adventurous"
  | "social"
  | "sweet"
  | "budget"
  | "crisp"
  | "cozy";

export type QuestionOption = {
  id: string;
  label: string;
  traits: Partial<Record<Trait, number>>;
};

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: QuestionOption[];
};

export type Persona = {
  personaId: string;
  title: string;
  description: string;
  recommendedStyles: [string, string, string];
  requiredTraits: Partial<Record<Trait, number>>;
  traitProfile: Partial<Record<Trait, number>>;
  explanationTemplate: string[];
};

export type ScoreResult = {
  personaId: string;
  title: string;
  description: string;
  recommendedStyles: [string, string, string];
  topTraits: Array<{ trait: Trait; score: number }>;
  explanationBullets: string[];
};
