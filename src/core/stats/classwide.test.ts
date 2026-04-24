import { describe, it, expect } from 'vitest'
import { computeStats } from './classwide'
import type { Essay, RubricScores } from '@/types'

const s = (dim: Record<string, number>, total: number): RubricScores => ({
  dimensionScores: dim,
  typoDeduction: 0,
  lengthDeduction: 0,
  total,
})

const essay = (over: Partial<Essay>): Essay => ({
  id: over.id ?? crypto.randomUUID(),
  batchId: 'b',
  studentId: over.studentId ?? 'stu',
  pageIds: [],
  ocrName: null,
  matchConfidence: 1,
  aiScores: null,
  aiComment: null,
  aiTypos: [],
  aiHighlights: [],
  aiReadabilityNotes: null,
  teacherScores: null,
  teacherComment: null,
  status: 'graded',
  updatedAt: 0,
  ...over,
})

describe('computeStats', () => {
  it('以 teacherScores 優先於 aiScores', () => {
    const e1 = essay({ aiScores: s({ A: 1 }, 1), teacherScores: s({ A: 2 }, 2) })
    const r = computeStats([e1], ['A'])
    expect(r.totalDistribution.mean).toBe(2)
  })

  it('錯字排行依頻率遞減', () => {
    const e1 = essay({
      studentId: 'a',
      aiTypos: [
        { wrong: '因該', correct: '應該', context: '' },
        { wrong: '在一次', correct: '再一次', context: '' },
      ],
      teacherScores: s({ A: 1 }, 1),
    })
    const e2 = essay({
      studentId: 'b',
      aiTypos: [{ wrong: '因該', correct: '應該', context: '' }],
      teacherScores: s({ A: 1 }, 1),
    })
    const r = computeStats([e1, e2], ['A'])
    expect(r.typoRanking[0]).toEqual(
      expect.objectContaining({ wrong: '因該', count: 2 }),
    )
    expect(r.typoRanking[0].studentIds.sort()).toEqual(['a', 'b'])
  })

  it('highlights 蒐集每一個 essay 的佳句', () => {
    const e1 = essay({
      aiHighlights: ['佳句一', '佳句二'],
      teacherScores: s({ A: 1 }, 1),
    })
    const r = computeStats([e1], ['A'])
    expect(r.highlights).toHaveLength(2)
  })

  it('空陣列不壞', () => {
    const r = computeStats([], ['A'])
    expect(r.n).toBe(0)
    expect(r.totalDistribution.mean).toBe(0)
  })

  it('未評分的 essay 不計入 n', () => {
    const e1 = essay({ status: 'pending' })
    const e2 = essay({ teacherScores: s({ A: 1 }, 1) })
    const r = computeStats([e1, e2], ['A'])
    expect(r.n).toBe(1)
  })
})
