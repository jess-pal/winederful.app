import type { Persona } from "@/lib/scoring/types";

export const PERSONAS: Persona[] = [
  {
    personaId: "main-character-merlot",
    title: "The Main Character Merlot",
    description: "You arrive with confidence and choose smooth, crowd-pleasing wines that always work.",
    recommendedStyles: ["Merlot", "Plush Red Blends", "Easy Cabernet Sauvignon"],
    requiredTraits: { bold: 6 },
    traitProfile: { bold: 3, social: 2, classic: 1, cozy: 1 },
    explanationTemplate: [
      "You favor smooth, confident wines that land with everyone.",
      "Reliable does not mean basic. Your choices are polished and intentional."
    ]
  },
  {
    personaId: "pinot-noir-overthinker",
    title: "The Pinot Noir Overthinker",
    description: "You love nuance, subtext, and elegant wines with emotional complexity.",
    recommendedStyles: ["Pinot Noir", "Cinsault", "Cool-Climate Red Blends"],
    requiredTraits: { classic: 6 },
    traitProfile: { classic: 3, cozy: 2, crisp: 1, adventurous: 1 },
    explanationTemplate: [
      "You consistently picked subtle, layered profiles over loud intensity.",
      "Your palate values detail, finesse, and complexity in every sip."
    ]
  },
  {
    personaId: "chenin-blanc-evangelist",
    title: "The Chenin Blanc Evangelist",
    description: "Bright, lively, and energetic. You champion fresh wines that feel alive.",
    recommendedStyles: ["Chenin Blanc", "Sauvignon Blanc", "Zesty White Blends"],
    requiredTraits: { crisp: 6 },
    traitProfile: { crisp: 3, adventurous: 1, social: 1 },
    explanationTemplate: [
      "You repeatedly leaned toward bright acidity and vibrant freshness.",
      "Your picks show a lively palate that likes energy and lift."
    ]
  },
  {
    personaId: "surprise-me-sommelier",
    title: "The \"Surprise Me\" Sommelier",
    description: "You skip the obvious and chase unusual bottles with story and character.",
    recommendedStyles: ["Orange Wine", "Natural Wine", "Experimental Regional Blends"],
    requiredTraits: { adventurous: 6 },
    traitProfile: { adventurous: 3, crisp: 1, bold: 1, social: 1 },
    explanationTemplate: [
      "You repeatedly chose discovery over familiar labels.",
      "You are drawn to unusual styles, new regions, and wines with a story."
    ]
  },
  {
    personaId: "braai-boss",
    title: "The Braai Boss",
    description: "Big table energy, smoky food, and bold pours with backbone.",
    recommendedStyles: ["Shiraz", "Pinotage", "Stellenbosch Bold Reds"],
    requiredTraits: { bold: 5, social: 4 },
    traitProfile: { bold: 3, social: 3, classic: 1, cozy: 1 },
    explanationTemplate: [
      "You chose powerful wines built for fire, food, and full tables.",
      "Your style is generous, social, and unmistakably bold."
    ]
  },
  {
    personaId: "rose-all-day-diplomat",
    title: "The Rose All Day Diplomat",
    description: "Low drama, high aesthetic. You pick balanced wines that match the vibe perfectly.",
    recommendedStyles: ["Rose", "Chillable Reds", "Grenache Coastal Blends"],
    requiredTraits: { social: 6 },
    traitProfile: { social: 3, crisp: 1, cozy: 1, sweet: 1 },
    explanationTemplate: [
      "Your choices balance softness, freshness, and effortless style.",
      "You optimize for harmony and mood without sacrificing quality."
    ]
  },
  {
    personaId: "cabernet-ceo",
    title: "The Cabernet CEO",
    description: "Structured, decisive, and serious about quality. You choose with authority.",
    recommendedStyles: ["Cabernet Sauvignon", "Bordeaux Blends", "Structured Reserve Reds"],
    requiredTraits: { classic: 5, bold: 4 },
    traitProfile: { classic: 3, bold: 2, social: 1 },
    explanationTemplate: [
      "You consistently selected structure, depth, and classic authority.",
      "Your palate signals leadership energy and no-nonsense decisions."
    ]
  },
  {
    personaId: "acid-queen-or-king",
    title: "The Acid Queen (or King)",
    description: "Crisp, sharp, and clean wins every time. You want precision over plushness.",
    recommendedStyles: ["High-Acid Riesling", "Mineral Chardonnay", "Sauvignon Blanc with Bite"],
    requiredTraits: { crisp: 5, adventurous: 3 },
    traitProfile: { crisp: 3, adventurous: 2, classic: 1 },
    explanationTemplate: [
      "You repeatedly favored mouth-watering acidity and tension.",
      "Your style is focused, clean, and unapologetically crisp."
    ]
  }
];
