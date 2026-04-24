import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Student } from '@/types'

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

import { groupPages } from './grouper'
import * as gemini from './gemini'

const roster: Student[] = [
  { id: 's1', classId: 'c1', seatNo: 1, name: '王小明' },
  { id: 's2', classId: 'c1', seatNo: 2, name: '陳大華' },
  { id: 's3', classId: 'c1', seatNo: 3, name: '林美玲' },
]

describe('groupPages', () => {
  beforeEach(() => vi.clearAllMocks())

  it('AI 有給 suggestedStudentId 就直接用', async () => {
    vi.mocked(gemini.callGemini).mockResolvedValue({
      parsed: null,
      rawText: JSON.stringify([
        { pages: [1, 2], ocrName: '陳大華', confidence: 0.9, suggestedStudentId: 's2' },
      ]),
      usage: { promptTokens: 0, outputTokens: 0 },
      durationMs: 10,
    })
    const r = await groupPages({
      apiKey: 'k',
      model: 'gemini-2.5-flash',
      thumbnails: [new Blob(), new Blob()],
      roster,
    })
    expect(r[0].studentId).toBe('s2')
    expect(r[0].confidence).toBe(0.9)
  })

  it('AI 沒給 suggestedStudentId 時用 Levenshtein 補強', async () => {
    vi.mocked(gemini.callGemini).mockResolvedValue({
      parsed: null,
      rawText: JSON.stringify([
        { pages: [1, 2], ocrName: '林美鈴', confidence: 0.7, suggestedStudentId: null },
      ]),
      usage: { promptTokens: 0, outputTokens: 0 },
      durationMs: 10,
    })
    const r = await groupPages({
      apiKey: 'k',
      model: 'gemini-2.5-flash',
      thumbnails: [new Blob(), new Blob()],
      roster,
    })
    expect(r[0].studentId).toBe('s3') // 「林美鈴」→「林美玲」一字差
  })

  it('回傳非 JSON 時拋錯', async () => {
    vi.mocked(gemini.callGemini).mockResolvedValue({
      parsed: null,
      rawText: 'not json at all',
      usage: { promptTokens: 0, outputTokens: 0 },
      durationMs: 10,
    })
    await expect(
      groupPages({
        apiKey: 'k',
        model: 'gemini-2.5-flash',
        thumbnails: [new Blob()],
        roster,
      }),
    ).rejects.toThrow(/非 JSON/)
  })
})
