import { z } from "zod";

export const answerSchema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1)
});

export const quizSubmitSchema = z.object({
  answers: z.array(answerSchema).length(10)
});

export const shareResolveSchema = z.object({
  token: z.string().min(10).max(128)
});

export const emailSignupSchema = z.object({
  email: z.string().email(),
  marketingOptIn: z.boolean().refine((v) => v, { message: "Marketing consent is required" }),
  consentVersion: z.string().min(1),
  source: z.string().max(64).optional()
});
