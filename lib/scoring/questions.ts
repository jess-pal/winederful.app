import type { QuizQuestion } from "@/lib/scoring/types";

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "Pick a Friday night vibe:",
    options: [
      { id: "q1_a", label: "Dinner party with friends", traits: { social: 2, classic: 1 } },
      { id: "q1_b", label: "Quiet night with a book", traits: { cozy: 2, classic: 1 } },
      { id: "q1_c", label: "Trying a new wine bar", traits: { adventurous: 2, social: 1 } },
      { id: "q1_d", label: "Big steak and bold music", traits: { bold: 2 } }
    ]
  },
  {
    id: "q2",
    prompt: "What flavor profile sounds best?",
    options: [
      { id: "q2_a", label: "Crisp citrus and herbs", traits: { crisp: 2 } },
      { id: "q2_b", label: "Dark berries and spice", traits: { bold: 2 } },
      { id: "q2_c", label: "Floral and lightly sweet", traits: { sweet: 2 } },
      { id: "q2_d", label: "Earthy and old-world", traits: { classic: 2 } }
    ]
  },
  {
    id: "q3",
    prompt: "How do you choose a bottle?",
    options: [
      { id: "q3_a", label: "Trusted classic region", traits: { classic: 2 } },
      { id: "q3_b", label: "Best value under budget", traits: { budget: 2 } },
      { id: "q3_c", label: "Something I have never had", traits: { adventurous: 2 } },
      { id: "q3_d", label: "Most intense option", traits: { bold: 2 } }
    ]
  },
  {
    id: "q4",
    prompt: "Choose a food pairing:",
    options: [
      { id: "q4_a", label: "Oysters", traits: { crisp: 2 } },
      { id: "q4_b", label: "Mushroom pasta", traits: { cozy: 2 } },
      { id: "q4_c", label: "Cheeseboard with friends", traits: { social: 2 } },
      { id: "q4_d", label: "Chocolate tart", traits: { sweet: 2 } }
    ]
  },
  {
    id: "q5",
    prompt: "Pick your wine region destination:",
    options: [
      { id: "q5_a", label: "Bordeaux", traits: { classic: 2 } },
      { id: "q5_b", label: "Napa", traits: { bold: 2 } },
      { id: "q5_c", label: "Stellenbosch, South Africa", traits: { adventurous: 2, bold: 1 } },
      { id: "q5_d", label: "Any place with value tastings", traits: { budget: 2 } }
    ]
  },
  {
    id: "q6",
    prompt: "Your ideal texture is:",
    options: [
      { id: "q6_a", label: "Light and zippy", traits: { crisp: 2 } },
      { id: "q6_b", label: "Velvety and smooth", traits: { cozy: 2 } },
      { id: "q6_c", label: "Layered and structured", traits: { classic: 1, bold: 1 } },
      { id: "q6_d", label: "Playful and fizzy", traits: { social: 2 } }
    ]
  },
  {
    id: "q7",
    prompt: "At the wine shop, you ask for:",
    options: [
      { id: "q7_a", label: "A hidden gem under $20", traits: { budget: 2 } },
      { id: "q7_b", label: "Something celebratory", traits: { social: 2 } },
      { id: "q7_c", label: "Something sweet-leaning", traits: { sweet: 2 } },
      { id: "q7_d", label: "Something with serious tannins", traits: { bold: 2 } }
    ]
  },
  {
    id: "q8",
    prompt: "Choose a music pairing:",
    options: [
      { id: "q8_a", label: "Classical or jazz", traits: { classic: 2 } },
      { id: "q8_b", label: "Indie discovery playlist", traits: { adventurous: 2 } },
      { id: "q8_c", label: "Soft acoustic", traits: { cozy: 2 } },
      { id: "q8_d", label: "Pop dance anthems", traits: { social: 2 } }
    ]
  },
  {
    id: "q9",
    prompt: "What matters most in a recommendation?",
    options: [
      { id: "q9_a", label: "Easy to pair with weeknight meals", traits: { budget: 1, cozy: 1 } },
      { id: "q9_b", label: "Distinctive and surprising", traits: { adventurous: 2 } },
      { id: "q9_c", label: "Crisp and refreshing", traits: { crisp: 2 } },
      { id: "q9_d", label: "Rich and decadent", traits: { sweet: 1, bold: 1 } }
    ]
  },
  {
    id: "q10",
    prompt: "Final pick: your hosting style",
    options: [
      { id: "q10_a", label: "Elegant formal dinner", traits: { classic: 2 } },
      { id: "q10_b", label: "Casual movie night", traits: { cozy: 2 } },
      { id: "q10_c", label: "Large celebration", traits: { social: 2 } },
      { id: "q10_d", label: "Experimental tasting flight", traits: { adventurous: 2 } }
    ]
  }
];
