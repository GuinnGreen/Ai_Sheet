// ---------- Rubric ----------
export interface RubricDimension {
  name: string       // "立意取材" | "結構組織" | "遣詞造句"
  maxScore: number   // 通常 2
}

export interface RubricDeductions {
  typoPerThree: number   // 每 3 錯字扣 N 分
  typoMax: number        // 錯字扣分上限
  lengthUnder: number    // 字數不足扣分
}

export interface Rubric {
  dimensions: RubricDimension[]
  deductions: RubricDeductions
}

export const DEFAULT_RUBRIC: Rubric = {
  dimensions: [
    { name: '立意取材', maxScore: 2 },
    { name: '結構組織', maxScore: 2 },
    { name: '遣詞造句', maxScore: 2 },
  ],
  deductions: { typoPerThree: 0.5, typoMax: 1, lengthUnder: 1 },
}

// ---------- Scores ----------
export interface RubricScores {
  dimensionScores: Record<string, number>
  typoDeduction: number
  lengthDeduction: number
  total: number
}

export interface Typo {
  wrong: string
  correct: string
  context: string
}

// ---------- Entities ----------
export interface Setting {
  key: string
  value: unknown
}

export interface Class {
  id: string
  name: string
  grade: number
  schoolYear: string
  createdAt: number
}

export interface Student {
  id: string
  classId: string
  seatNo: number
  name: string
}

export type BatchStatus =
  | 'draft'
  | 'splitting'
  | 'ready_to_grade'
  | 'grading'
  | 'completed'

export interface Batch {
  id: string
  classId: string
  title: string
  topic: string
  minWords: number
  rubric: Rubric
  examDate: string
  createdAt: number
  status: BatchStatus
}

export type EssayStatus = 'pending' | 'graded' | 'reviewed'

export interface Essay {
  id: string
  batchId: string
  studentId: string | null
  pageIds: string[]
  ocrName: string | null
  matchConfidence: number
  aiScores: RubricScores | null
  aiComment: string | null
  aiTypos: Typo[]
  aiHighlights: string[]
  aiReadabilityNotes: string | null
  teacherScores: RubricScores | null
  teacherComment: string | null
  status: EssayStatus
  updatedAt: number
}

export interface Page {
  id: string
  essayId: string | null
  batchId: string
  pageIndex: number
  imageBlob: Blob
  thumbnailBlob: Blob
  rotation: number
}

export interface GradingRun {
  id: string
  essayId: string
  model: string
  promptVersion: string
  rawResponse: string
  parsedResult: unknown
  costEstimateUsd: number
  durationMs: number
  createdAt: number
}
