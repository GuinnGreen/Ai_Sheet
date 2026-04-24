import { z } from 'zod'

export const RubricScoresSchema = z.object({
  scores: z.record(z.string(), z.number().min(0).max(6)),
  deductions: z.object({
    typo: z.number().min(0),
    length: z.number().min(0),
  }),
  total: z.number().min(0).max(10),
  wordCountEstimate: z.number().int().nonnegative(),
  typos: z.array(
    z.object({
      wrong: z.string(),
      correct: z.string(),
      context: z.string(),
    }),
  ),
  highlights: z.array(z.string()),
  comment: z.string(),
  readabilityNotes: z.string().optional().default(''),
})
export type GradingAiResult = z.infer<typeof RubricScoresSchema>

export const PageGroupingItemSchema = z.object({
  pages: z.array(z.number().int().positive()),
  ocrName: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  suggestedStudentId: z.string().nullable(),
})
export const PageGroupingSchema = z.array(PageGroupingItemSchema)
export type PageGroupingAi = z.infer<typeof PageGroupingSchema>
