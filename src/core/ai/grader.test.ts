import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DEFAULT_RUBRIC } from '@/types'

vi.mock('./gemini', async importOriginal => {
  const mod = await importOriginal<typeof import('./gemini')>()
  return {
    ...mod,
    callGemini: vi.fn(),
    blobToImagePart: vi.fn(async () => ({
      inlineData: { mimeType: 'image/jpeg', data: '' },
    })),
  }
})

import { gradeEssay } from './grader'
import * as gemini from './gemini'

const okResponse = JSON.stringify({
  scores: { 立意取材: 1.5, 結構組織: 1.0, 遣詞造句: 1.5 },
  deductions: { typo: 0, length: 0 },
  total: 4.0,
  wordCountEstimate: 520,
  typos: [{ wrong: '因該', correct: '應該', context: '因該要去' }],
  highlights: ['陽光灑在...'],
  comment: '（100字）',
  readabilityNotes: '清晰',
})

describe('gradeEssay', () => {
  beforeEach(() => vi.clearAllMocks())

  it('parse 成功回傳結構化結果', async () => {
    vi.mocked(gemini.callGemini).mockResolvedValueOnce({
      parsed: null,
      rawText: okResponse,
      usage: { promptTokens: 1000, outputTokens: 500 },
      durationMs: 100,
    })
    const r = await gradeEssay({
      apiKey: 'k',
      model: 'gemini-2.5-flash',
      imageBlobs: [new Blob()],
      topic: '那些未曾褪色的風景',
      minWords: 500,
      rubric: DEFAULT_RUBRIC,
    })
    expect(r.result.total).toBe(4)
    expect(r.result.typos).toHaveLength(1)
    expect(r.promptVersion).toBe('grading-v1.0.0')
    expect(r.usage.promptTokens).toBe(1000)
  })

  it('第一次失敗、第二次成功 → 回傳成功結果', async () => {
    vi.mocked(gemini.callGemini)
      .mockResolvedValueOnce({
        parsed: null,
        rawText: 'junk',
        usage: { promptTokens: 0, outputTokens: 0 },
        durationMs: 10,
      })
      .mockResolvedValueOnce({
        parsed: null,
        rawText: okResponse,
        usage: { promptTokens: 500, outputTokens: 200 },
        durationMs: 50,
      })
    const r = await gradeEssay({
      apiKey: 'k',
      model: 'gemini-2.5-flash',
      imageBlobs: [new Blob()],
      topic: 't',
      minWords: 500,
      rubric: DEFAULT_RUBRIC,
    })
    expect(r.result.total).toBe(4)
  })

  it('兩次都失敗 → 拋錯', async () => {
    vi.mocked(gemini.callGemini).mockResolvedValue({
      parsed: null,
      rawText: 'junk',
      usage: { promptTokens: 0, outputTokens: 0 },
      durationMs: 1,
    })
    await expect(
      gradeEssay({
        apiKey: 'k',
        model: 'gemini-2.5-flash',
        imageBlobs: [new Blob()],
        topic: 't',
        minWords: 500,
        rubric: DEFAULT_RUBRIC,
      }),
    ).rejects.toThrow()
  })
})
