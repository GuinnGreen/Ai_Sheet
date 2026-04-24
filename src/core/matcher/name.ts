import { levenshtein } from './levenshtein'
import type { Student } from '@/types'

export interface NameMatchResult {
  studentId: string | null
  confidence: number
  rawDistance: number
}

export function matchNameToRoster(
  ocrName: string | null | undefined,
  roster: Student[]
): NameMatchResult {
  const name = (ocrName ?? '').trim()
  if (!name || roster.length === 0) {
    return { studentId: null, confidence: 0, rawDistance: Infinity }
  }
  let bestId: string | null = null
  let bestDist = Infinity
  for (const s of roster) {
    const d = levenshtein(name, s.name)
    if (d < bestDist) { bestDist = d; bestId = s.id }
  }
  const maxLen = Math.max(name.length, 1)
  const confidence = Math.max(0, 1 - bestDist / maxLen)
  const accept = confidence >= 0.4
  return {
    studentId: accept ? bestId : null,
    confidence: accept ? confidence : 0,
    rawDistance: bestDist,
  }
}
