import { callGemini, blobToImagePart } from './gemini'
import { buildGroupingPrompt, PROMPT_VERSION_GROUPING } from './prompts'
import { PageGroupingSchema } from './schemas'
import { matchNameToRoster } from '@/core/matcher/name'
import type { Student } from '@/types'

export interface GroupingResultItem {
  pages: number[]
  ocrName: string | null
  studentId: string | null
  confidence: number
}

export async function groupPages(input: {
  apiKey: string
  model: string
  thumbnails: Blob[]
  roster: Student[]
}): Promise<GroupingResultItem[]> {
  const parts = [
    {
      text: buildGroupingPrompt({
        roster: input.roster,
        pageCount: input.thumbnails.length,
      }),
    },
    ...(await Promise.all(input.thumbnails.map(b => blobToImagePart(b)))),
  ]
  const res = await callGemini({
    apiKey: input.apiKey,
    model: input.model,
    parts,
    temperature: 0.1,
  })
  let obj: unknown
  try {
    obj = JSON.parse(res.rawText)
  } catch {
    throw new Error(
      'Gemini grouping 回傳非 JSON: ' + res.rawText.slice(0, 200),
    )
  }
  const parsed = PageGroupingSchema.parse(obj)

  return parsed.map(item => {
    if (item.suggestedStudentId) {
      return {
        pages: item.pages,
        ocrName: item.ocrName,
        studentId: item.suggestedStudentId,
        confidence: item.confidence,
      }
    }
    const fallback = matchNameToRoster(item.ocrName, input.roster)
    return {
      pages: item.pages,
      ocrName: item.ocrName,
      studentId: fallback.studentId,
      confidence: fallback.studentId ? fallback.confidence : item.confidence,
    }
  })
}

export { PROMPT_VERSION_GROUPING }
