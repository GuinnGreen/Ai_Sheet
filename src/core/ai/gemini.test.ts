import { describe, it, expect, vi } from 'vitest'

const mockGenerateContent = vi.fn()

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerateContent }
  },
}))

import { callGemini, blobToBase64 } from './gemini'

describe('callGemini', () => {
  it('回傳解析後的 JSON 與 usage（含 responseSchema 時）', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({ ok: true }),
      usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 },
    })
    const r = await callGemini({
      apiKey: 'k',
      model: 'gemini-2.5-flash',
      parts: [{ text: 'hi' }],
      responseSchema: { type: 'OBJECT' as never },
    })
    expect(r.parsed).toEqual({ ok: true })
    expect(r.usage.promptTokens).toBe(100)
    expect(r.usage.outputTokens).toBe(50)
  })

  it('沒給 responseSchema 時 parsed 為 null、rawText 保留', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'plain text response',
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
    })
    const r = await callGemini({
      apiKey: 'k',
      model: 'gemini-2.5-flash',
      parts: [{ text: 'hi' }],
    })
    expect(r.parsed).toBeNull()
    expect(r.rawText).toBe('plain text response')
  })
})

describe('blobToBase64', () => {
  it('將小 Blob 轉為 base64', async () => {
    const blob = new Blob([new Uint8Array([72, 105])]) // "Hi"
    expect(await blobToBase64(blob)).toBe('SGk=')
  })
})
