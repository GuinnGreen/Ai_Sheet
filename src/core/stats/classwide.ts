import type { Essay, RubricScores } from '@/types'

export interface StatsResult {
  n: number
  dimensions: Record<
    string,
    { mean: number; min: number; max: number; histogram: number[] }
  >
  totalDistribution: {
    mean: number
    min: number
    max: number
    histogram: number[]
  }
  typoRanking: Array<{
    wrong: string
    correct: string
    count: number
    studentIds: string[]
  }>
  highlights: Array<{
    essayId: string
    studentId: string | null
    text: string
  }>
}

function finalScores(e: Essay): RubricScores | null {
  return e.teacherScores ?? e.aiScores
}

export function computeStats(
  essays: Essay[],
  dimensionNames: string[],
): StatsResult {
  const graded = essays.filter(e => finalScores(e) !== null)
  const dimensions: StatsResult['dimensions'] = {}
  for (const d of dimensionNames) {
    const vals = graded.map(e => finalScores(e)!.dimensionScores[d] ?? 0)
    dimensions[d] = summarize(vals, 0, 2, 0.5)
  }
  const totals = graded.map(e => finalScores(e)!.total)
  const totalDistribution = summarize(totals, 0, 6, 1)

  const typoMap = new Map<
    string,
    {
      wrong: string
      correct: string
      count: number
      students: Set<string>
    }
  >()
  for (const e of essays) {
    for (const t of e.aiTypos) {
      const key = `${t.wrong}→${t.correct}`
      const v = typoMap.get(key) ?? {
        wrong: t.wrong,
        correct: t.correct,
        count: 0,
        students: new Set<string>(),
      }
      v.count += 1
      if (e.studentId) v.students.add(e.studentId)
      typoMap.set(key, v)
    }
  }
  const typoRanking = [...typoMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map(v => ({
      wrong: v.wrong,
      correct: v.correct,
      count: v.count,
      studentIds: [...v.students],
    }))

  const highlights: StatsResult['highlights'] = []
  for (const e of essays) {
    for (const h of e.aiHighlights) {
      highlights.push({ essayId: e.id, studentId: e.studentId, text: h })
    }
  }

  return {
    n: graded.length,
    dimensions,
    totalDistribution,
    typoRanking,
    highlights,
  }
}

function summarize(
  values: number[],
  min: number,
  max: number,
  bucketSize: number,
) {
  const n = values.length || 1
  const mean = values.reduce((a, b) => a + b, 0) / n
  const minV = values.length ? Math.min(...values) : 0
  const maxV = values.length ? Math.max(...values) : 0
  const bucketCount = Math.round((max - min) / bucketSize) + 1
  const histogram = new Array<number>(bucketCount).fill(0)
  for (const v of values) {
    const idx = Math.min(
      bucketCount - 1,
      Math.max(0, Math.round((v - min) / bucketSize)),
    )
    histogram[idx] += 1
  }
  return { mean, min: minV, max: maxV, histogram }
}
