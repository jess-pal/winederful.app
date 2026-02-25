import type { Persona } from "@/lib/scoring/types";

export const PERSONAS: Persona[] = [
  {
    personaId: "crisp-minimalist",
    title: "Crisp Minimalist",
    description: "You like bright, clean flavors and no-fuss choices.",
    recommendedStyles: ["Sauvignon Blanc", "Pinot Grigio", "Dry Riesling"],
    requiredTraits: { crisp: 6 },
    explanationTemplate: ["You repeatedly chose fresh, citrus-forward options.", "You value clarity and balance over heavy richness."]
  },
  {
    personaId: "cozy-romantic",
    title: "Cozy Romantic",
    description: "You lean into warm moments, soft textures, and comforting pours.",
    recommendedStyles: ["Pinot Noir", "Merlot", "Gamay"],
    requiredTraits: { cozy: 5 },
    explanationTemplate: ["Your answers favored smooth, cozy experiences.", "You gravitate toward gentle tannins and soft fruit."]
  },
  {
    personaId: "bold-main-character",
    title: "Bold Main Character",
    description: "You like statement wines with depth, structure, and presence.",
    recommendedStyles: ["Cabernet Sauvignon", "Syrah", "Malbec"],
    requiredTraits: { bold: 6 },
    explanationTemplate: ["You selected rich, expressive flavor directions.", "You consistently preferred intensity and power."]
  },
  {
    personaId: "adventurous-explorer",
    title: "Adventurous Explorer",
    description: "You enjoy discovery, unusual pairings, and trying new regions.",
    recommendedStyles: ["Orange Wine", "Pet-Nat", "Gruner Veltliner"],
    requiredTraits: { adventurous: 5 },
    explanationTemplate: ["You chose variety and novelty over safe picks.", "You showed high curiosity across pairings and contexts."]
  },
  {
    personaId: "elegant-traditionalist",
    title: "Elegant Traditionalist",
    description: "You prefer timeless choices, classic structure, and refined balance.",
    recommendedStyles: ["Chianti Classico", "Chardonnay", "Bordeaux Blend"],
    requiredTraits: { classic: 5 },
    explanationTemplate: ["You repeatedly leaned toward classic profiles.", "You value heritage styles and refined structure."]
  },
  {
    personaId: "sweet-tooth",
    title: "Sweet Tooth (With Style)",
    description: "You enjoy lush fruit and a touch of sweetness without losing elegance.",
    recommendedStyles: ["Moscato d'Asti", "Off-Dry Riesling", "Brachetto"],
    requiredTraits: { sweet: 5 },
    explanationTemplate: ["You preferred fruit-forward and approachable options.", "Your picks suggest a balanced sweet-leaning palate."]
  },
  {
    personaId: "sparkling-socialite",
    title: "Sparkling Socialite",
    description: "You are celebratory, lively, and happiest sharing wine with people.",
    recommendedStyles: ["Prosecco", "Cava", "Champagne Brut"],
    requiredTraits: { social: 5 },
    explanationTemplate: ["You selected festive and group-friendly choices.", "You consistently optimized for social occasions."]
  },
  {
    personaId: "budget-savvy-sipper",
    title: "Budget-Savvy Sipper",
    description: "You seek high value, smart picks, and reliable bottles.",
    recommendedStyles: ["Tempranillo", "Chenin Blanc", "Cotes du Rhone"],
    requiredTraits: { budget: 5 },
    explanationTemplate: ["You consistently prioritized value and versatility.", "Your choices show practical, quality-first instincts."]
  }
];
