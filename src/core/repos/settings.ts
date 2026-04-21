import { db } from '../db'

const K_API_KEY = 'apiKey'
const K_MODEL = 'model'

export async function getApiKey(): Promise<string | null> {
  const r = await db.settings.get(K_API_KEY)
  return (r?.value as string | undefined) ?? null
}
export async function setApiKey(v: string) {
  await db.settings.put({ key: K_API_KEY, value: v })
}
export async function clearApiKey() { await db.settings.delete(K_API_KEY) }

export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-pro'
export async function getSelectedModel(): Promise<GeminiModel> {
  const r = await db.settings.get(K_MODEL)
  return (r?.value as GeminiModel | undefined) ?? 'gemini-2.5-flash'
}
export async function setSelectedModel(m: GeminiModel) {
  await db.settings.put({ key: K_MODEL, value: m })
}
