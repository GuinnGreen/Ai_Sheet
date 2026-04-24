import { callGemini } from '@/core/ai/gemini'
import type { Essay } from '@/types'

export async function summarizeWeaknesses(input: {
  apiKey: string
  model: string
  essays: Essay[]
  topic: string
}): Promise<string> {
  const lines = input.essays
    .filter(e => e.aiComment)
    .map(e => `- ${e.aiComment}`)
    .join('\n')
  const prompt = `以下是一位國小老師所在班級對同一個作文題目「${input.topic}」所寫的 ${input.essays.length} 份作文的個別評語摘要：

${lines}

請歸納出整班在這次作文中：
1. 最普遍的 2-3 個亮點
2. 最普遍的 2-3 個待加強處
3. 老師下一次教學可以強調什麼

以一段約 200 字的自然段落回覆，語氣是給教師的備課建議。`
  const r = await callGemini({
    apiKey: input.apiKey,
    model: input.model,
    parts: [{ text: prompt }],
    temperature: 0.4,
  })
  return r.rawText
}
