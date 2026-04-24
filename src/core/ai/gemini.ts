import { GoogleGenAI, type Schema } from '@google/genai'

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }

export interface GeminiCallInput {
  apiKey: string
  model: string
  parts: GeminiPart[]
  responseSchema?: Schema
  systemInstruction?: string
  temperature?: number
}

export interface GeminiCallResult {
  parsed: unknown
  rawText: string
  usage: { promptTokens: number; outputTokens: number }
  durationMs: number
}

export class GeminiJsonParseError extends Error {
  readonly rawText: string
  constructor(rawText: string) {
    super(`Gemini 回傳非合法 JSON: ${rawText.slice(0, 120)}...`)
    this.name = 'GeminiJsonParseError'
    this.rawText = rawText
  }
}

export async function callGemini(input: GeminiCallInput): Promise<GeminiCallResult> {
  const ai = new GoogleGenAI({ apiKey: input.apiKey })
  const started = Date.now()
  const res = await ai.models.generateContent({
    model: input.model,
    contents: [{ role: 'user', parts: input.parts }],
    config: {
      systemInstruction: input.systemInstruction,
      temperature: input.temperature ?? 0.2,
      responseMimeType: input.responseSchema ? 'application/json' : undefined,
      responseSchema: input.responseSchema,
    },
  })
  const text = res.text ?? ''
  let parsed: unknown = null
  if (input.responseSchema) {
    try { parsed = JSON.parse(text) }
    catch { throw new GeminiJsonParseError(text) }
  }
  const usage = {
    promptTokens: res.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: res.usageMetadata?.candidatesTokenCount ?? 0,
  }
  return { parsed, rawText: text, usage, durationMs: Date.now() - started }
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export async function blobToImagePart(blob: Blob): Promise<GeminiPart> {
  return {
    inlineData: {
      mimeType: blob.type || 'image/jpeg',
      data: await blobToBase64(blob),
    },
  }
}
