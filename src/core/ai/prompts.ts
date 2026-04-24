import type { Rubric } from '@/types'

export const PROMPT_VERSION_GRADING = 'grading-v1.0.0'
export const PROMPT_VERSION_GROUPING = 'grouping-v1.0.0'

export function buildGradingPrompt(input: {
  topic: string
  minWords: number
  rubric: Rubric
}): string {
  const dims = input.rubric.dimensions
    .map(d => `  ${d.name} (0-${d.maxScore} 分)`)
    .join('\n')
  const maxTotal = input.rubric.dimensions.reduce((a, b) => a + b.maxScore, 0)
  const { typoPerThree, typoMax, lengthUnder } = input.rubric.deductions
  return `你是一位資深國小國語老師，正在評改六年級作文。

【題目】${input.topic}
【字數要求】${input.minWords} 字以上
【評分標準】(三向度加總滿分 ${maxTotal} 分)
${dims}
    立意取材：主題明確、取材切題、內容豐富
    結構組織：段落分明、起承轉合、前後連貫
    遣詞造句：用詞恰當、句子通順、修辭運用
【扣分規則】
  錯別字每 3 個扣 ${typoPerThree} 分（上限 ${typoMax} 分）
  字數不足扣 ${lengthUnder} 分

【任務】
1. 逐字閱讀作文（含手寫校正過的字跡）
2. 給三向度分數（允許 0.5 的半分）
3. 找出錯別字清單（錯字、正確字、出現的前後文）
4. 估算字數
5. 寫約 100 字評語：先肯定 1-2 個亮點，再具體指出 1-2 個可改進處，語氣溫和鼓勵
6. 挑 1-2 句佳句摘錄（供班級公告鼓勵之用）

嚴格輸出 JSON（不要包在 \`\`\` 裡，也不要任何前後說明文字）：
{
  "scores": { "立意取材": 1.5, "結構組織": 1.0, "遣詞造句": 1.5 },
  "deductions": { "typo": 0, "length": 0 },
  "total": 4.0,
  "wordCountEstimate": 520,
  "typos": [{"wrong":"因該", "correct":"應該", "context":"因該要去"}],
  "highlights": ["..."],
  "comment": "（約 100 字）",
  "readabilityNotes": "字跡清晰 / 部分潦草"
}`
}

export function buildGroupingPrompt(input: {
  roster: Array<{ id: string; seatNo: number; name: string }>
  pageCount: number
}): string {
  const rosterCsv = input.roster
    .map(s => `${s.seatNo},${s.name},${s.id}`)
    .join('\n')
  return `你會看到 ${input.pageCount} 張國小作文試卷掃描頁的縮圖（依頁碼順序）。每份作文通常是連續 2 頁（正反面）。

請完成兩件事：
1. 切分：哪些頁碼屬於同一份作文
2. 姓名辨識：每份作文第一頁右上角的學生姓名（手寫）

班級名單 (座號,姓名,studentId)：
${rosterCsv}

嚴格輸出 JSON 陣列（不要包在 \`\`\` 裡）：
[
  { "pages": [1,2], "ocrName": "陳大華", "confidence": 0.9, "suggestedStudentId": "..." }
]

規則：
- confidence 0-1
- 姓名辨識失敗或不在名單中：confidence < 0.5，suggestedStudentId = null
- 若某頁看似完全空白或非作文紙（例如封面分頁），自成一組並標 confidence = 0`
}
