import { describe, it, expect } from 'vitest'
import { RubricScoresSchema, PageGroupingSchema } from './schemas'

describe('RubricScoresSchema', () => {
  it('接受合法物件', () => {
    const r = RubricScoresSchema.parse({
      scores: { 立意取材: 1.5, 結構組織: 1, 遣詞造句: 1.5 },
      deductions: { typo: 0, length: 0 },
      total: 4,
      wordCountEstimate: 520,
      typos: [],
      highlights: [],
      comment: '不錯',
    })
    expect(r.total).toBe(4)
    expect(r.readabilityNotes).toBe('')
  })

  it('拒絕負分', () => {
    expect(() =>
      RubricScoresSchema.parse({
        scores: { x: -1 },
        deductions: { typo: 0, length: 0 },
        total: 0,
        wordCountEstimate: 0,
        typos: [],
        highlights: [],
        comment: '',
      }),
    ).toThrow()
  })
})

describe('PageGroupingSchema', () => {
  it('接受陣列', () => {
    expect(
      PageGroupingSchema.parse([
        { pages: [1, 2], ocrName: '陳', confidence: 0.9, suggestedStudentId: null },
      ]),
    ).toHaveLength(1)
  })

  it('拒絕 confidence 超過 1', () => {
    expect(() =>
      PageGroupingSchema.parse([
        { pages: [1], ocrName: null, confidence: 1.5, suggestedStudentId: null },
      ]),
    ).toThrow()
  })
})
