import { callGemini, blobToImagePart } from './gemini'
import { buildGradingPrompt, PROMPT_VERSION_GRADING } from './prompts'
import { RubricScoresSchema, type GradingAiResult } from './schemas'
import type { Rubric } from '@/types'

export interface GradeEssayInput {
  apiKey: string
  model: string
  imageBlobs: Blob[]
  topic: string
  minWords: number
  rubric: Rubric
}

export interface GradeEssayOutput {
  result: GradingAiResult
  rawText: string
  usage: { promptTokens: number; outputTokens: number }
  durationMs: number
  promptVersion: string
}

export async function gradeEssay(input: GradeEssayInput): Promise<GradeEssayOutput> {
  const parts = [
    {
      text: buildGradingPrompt({
        topic: input.topic,
        minWords: input.minWords,
        rubric: input.rubric,
      }),
    },
    ...(await Promise.all(input.imageBlobs.map(b => blobToImagePart(b)))),
  ]

  const attempt = async () => {
    const r = await callGemini({
      apiKey: input.apiKey,
      model: input.model,
      parts,
      temperature: 0.2,
    })
    let obj: unknown
    try {
      obj = JSON.parse(r.rawText)
    } catch {
      throw new Error('Grading 回傳非 JSON：' + r.rawText.slice(0, 200))
    }
    return {
      result: RubricScoresSchema.parse(obj),
      raw: r.rawText,
      usage: r.usage,
      dur: r.durationMs,
    }
  }

  let lastErr: unknown
  for (let i = 0; i < 2; i++) {
    try {
      const a = await attempt()
      return {
        result: a.result,
        rawText: a.raw,
        usage: a.usage,
        durationMs: a.dur,
        promptVersion: PROMPT_VERSION_GRADING,
      }
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}
