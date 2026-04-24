import { db } from '@/core/db'
import { listPagesByBatch, updatePage } from '@/core/repos/pages'
import { createEssay, updateEssay, listEssaysByBatch } from '@/core/repos/essays'
import { getBatch, setBatchStatus } from '@/core/repos/batches'
import { listStudents } from '@/core/repos/students'
import { recordGradingRun } from '@/core/repos/gradingRuns'
import { groupPages } from './grouper'
import { gradeEssay } from './grader'

export interface OrchestratorInput {
  batchId: string
  apiKey: string
  model: string
}

export async function runGroupingPhase(input: OrchestratorInput): Promise<void> {
  const batch = await getBatch(input.batchId)
  if (!batch) throw new Error('Batch 不存在')
  await setBatchStatus(input.batchId, 'splitting')

  const pages = await listPagesByBatch(input.batchId)
  const roster = await listStudents(batch.classId)
  const thumbs = pages.map(p => p.thumbnailBlob)

  const groups = await groupPages({
    apiKey: input.apiKey,
    model: input.model,
    thumbnails: thumbs,
    roster,
  })

  // 清掉既有 essays（視為重跑）
  const existing = await listEssaysByBatch(input.batchId)
  await db.essays.bulkDelete(existing.map(e => e.id))

  for (const g of groups) {
    const pageRows = g.pages
      .map(pi => pages.find(p => p.pageIndex === pi))
      .filter((p): p is typeof pages[number] => Boolean(p))
    const essay = await createEssay({
      batchId: input.batchId,
      studentId: g.studentId,
      pageIds: pageRows.map(p => p.id),
      ocrName: g.ocrName,
      matchConfidence: g.confidence,
    })
    for (const p of pageRows) {
      await updatePage(p.id, { essayId: essay.id })
    }
  }

  await setBatchStatus(input.batchId, 'ready_to_grade')
}

export interface GradingPhaseInput extends OrchestratorInput {
  onProgress?: (done: number, total: number) => void
}

export async function runGradingPhase(input: GradingPhaseInput): Promise<void> {
  const batch = await getBatch(input.batchId)
  if (!batch) throw new Error('Batch 不存在')
  await setBatchStatus(input.batchId, 'grading')

  const essays = await listEssaysByBatch(input.batchId)
  for (let i = 0; i < essays.length; i++) {
    const e = essays[i]
    if (e.status === 'reviewed') {
      input.onProgress?.(i + 1, essays.length)
      continue
    }
    const pages = await db.pages.where('id').anyOf(e.pageIds).sortBy('pageIndex')
    try {
      const res = await gradeEssay({
        apiKey: input.apiKey,
        model: input.model,
        imageBlobs: pages.map(p => p.imageBlob),
        topic: batch.topic,
        minWords: batch.minWords,
        rubric: batch.rubric,
      })
      await updateEssay(e.id, {
        aiScores: {
          dimensionScores: res.result.scores,
          typoDeduction: res.result.deductions.typo,
          lengthDeduction: res.result.deductions.length,
          total: res.result.total,
        },
        aiComment: res.result.comment,
        aiTypos: res.result.typos,
        aiHighlights: res.result.highlights,
        aiReadabilityNotes: res.result.readabilityNotes,
        status: 'graded',
      })
      await recordGradingRun({
        essayId: e.id,
        model: input.model,
        promptVersion: res.promptVersion,
        rawResponse: res.rawText,
        parsedResult: res.result,
        costEstimateUsd: estimateCost(input.model, res.usage),
        durationMs: res.durationMs,
      })
    } catch (err) {
      await updateEssay(e.id, {
        status: 'pending',
        aiReadabilityNotes: `評分失敗：${String(err).slice(0, 200)}`,
      })
    }
    input.onProgress?.(i + 1, essays.length)
  }

  await setBatchStatus(input.batchId, 'completed')
}

function estimateCost(
  model: string,
  usage: { promptTokens: number; outputTokens: number },
): number {
  const rates = model.includes('flash')
    ? { input: 0.3 / 1e6, output: 2.5 / 1e6 }
    : { input: 1.25 / 1e6, output: 10 / 1e6 }
  return usage.promptTokens * rates.input + usage.outputTokens * rates.output
}
