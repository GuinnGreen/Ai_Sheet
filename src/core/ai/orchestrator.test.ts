import { describe, it, expect, vi, beforeEach } from 'vitest'
import { db } from '@/core/db'
import { createBatch } from '@/core/repos/batches'
import { createClass } from '@/core/repos/classes'
import { addPage } from '@/core/repos/pages'
import { DEFAULT_RUBRIC } from '@/types'

vi.mock('./grouper', () => ({
  groupPages: vi.fn().mockResolvedValue([
    { pages: [1, 2], ocrName: '王小明', studentId: 's-王小明', confidence: 1 },
  ]),
  PROMPT_VERSION_GROUPING: 'grouping-v1.0.0',
}))

vi.mock('./grader', () => ({
  gradeEssay: vi.fn().mockResolvedValue({
    result: {
      scores: { 立意取材: 2, 結構組織: 2, 遣詞造句: 2 },
      deductions: { typo: 0, length: 0 },
      total: 6,
      wordCountEstimate: 600,
      typos: [],
      highlights: ['佳句'],
      comment: '讚',
      readabilityNotes: '清晰',
    },
    rawText: '{}',
    usage: { promptTokens: 1, outputTokens: 1 },
    durationMs: 10,
    promptVersion: 'grading-v1.0.0',
  }),
}))

import { runGroupingPhase, runGradingPhase } from './orchestrator'

describe('orchestrator', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('runGroupingPhase 建立 essays 並關聯 pages', async () => {
    const cls = await createClass({ name: 'A', grade: 6, schoolYear: '114-2' })
    await db.students.add({ id: 's-王小明', classId: cls.id, seatNo: 99, name: '王小明' })
    const batch = await createBatch({
      classId: cls.id,
      title: 't',
      topic: 'x',
      minWords: 500,
      rubric: DEFAULT_RUBRIC,
      examDate: '2026-04-21',
    })
    const blob = new Blob([new Uint8Array([1])], { type: 'image/jpeg' })
    await addPage({
      batchId: batch.id, essayId: null, pageIndex: 1,
      imageBlob: blob, thumbnailBlob: blob, rotation: 0,
    })
    await addPage({
      batchId: batch.id, essayId: null, pageIndex: 2,
      imageBlob: blob, thumbnailBlob: blob, rotation: 0,
    })

    await runGroupingPhase({ batchId: batch.id, apiKey: 'k', model: 'gemini-2.5-flash' })

    const essays = await db.essays.where('batchId').equals(batch.id).toArray()
    expect(essays).toHaveLength(1)
    expect(essays[0].studentId).toBe('s-王小明')
    expect(essays[0].pageIds).toHaveLength(2)

    // pages 應被關聯到新 essay
    const pages = await db.pages.where('batchId').equals(batch.id).toArray()
    expect(pages.every(p => p.essayId === essays[0].id)).toBe(true)

    // batch status 更新
    const updatedBatch = await db.batches.get(batch.id)
    expect(updatedBatch?.status).toBe('ready_to_grade')
  })

  it('runGradingPhase 寫入 aiScores 與 gradingRun', async () => {
    const cls = await createClass({ name: 'A', grade: 6, schoolYear: '114-2' })
    await db.students.add({ id: 's-王小明', classId: cls.id, seatNo: 99, name: '王小明' })
    const batch = await createBatch({
      classId: cls.id,
      title: 't',
      topic: 'x',
      minWords: 500,
      rubric: DEFAULT_RUBRIC,
      examDate: '2026-04-21',
    })
    const blob = new Blob([new Uint8Array([1])], { type: 'image/jpeg' })
    await addPage({
      batchId: batch.id, essayId: null, pageIndex: 1,
      imageBlob: blob, thumbnailBlob: blob, rotation: 0,
    })

    await runGroupingPhase({ batchId: batch.id, apiKey: 'k', model: 'gemini-2.5-flash' })
    await runGradingPhase({ batchId: batch.id, apiKey: 'k', model: 'gemini-2.5-flash' })

    const essay = (await db.essays.where('batchId').equals(batch.id).toArray())[0]
    expect(essay.aiScores?.total).toBe(6)
    expect(essay.status).toBe('graded')

    const runs = await db.gradingRuns.where('essayId').equals(essay.id).toArray()
    expect(runs).toHaveLength(1)
    expect(runs[0].promptVersion).toBe('grading-v1.0.0')
  })
})
