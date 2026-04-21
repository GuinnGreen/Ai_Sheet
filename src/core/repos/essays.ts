import { db } from '../db'
import type { Essay } from '@/types'

export async function createEssay(
  input: Partial<Essay> & Pick<Essay, 'batchId' | 'pageIds'>
): Promise<Essay> {
  const e: Essay = {
    id: crypto.randomUUID(),
    batchId: input.batchId,
    studentId: input.studentId ?? null,
    pageIds: input.pageIds,
    ocrName: input.ocrName ?? null,
    matchConfidence: input.matchConfidence ?? 0,
    aiScores: input.aiScores ?? null,
    aiComment: input.aiComment ?? null,
    aiTypos: input.aiTypos ?? [],
    aiHighlights: input.aiHighlights ?? [],
    aiReadabilityNotes: input.aiReadabilityNotes ?? null,
    teacherScores: input.teacherScores ?? null,
    teacherComment: input.teacherComment ?? null,
    status: input.status ?? 'pending',
    updatedAt: Date.now(),
  }
  await db.essays.add(e)
  return e
}

export async function listEssaysByBatch(batchId: string) {
  return db.essays.where('batchId').equals(batchId).toArray()
}

export async function updateEssay(id: string, patch: Partial<Essay>) {
  await db.essays.update(id, { ...patch, updatedAt: Date.now() })
}

export async function getEssay(id: string) { return db.essays.get(id) }

export async function listEssaysByStudent(studentId: string) {
  return db.essays.where('studentId').equals(studentId).toArray()
}
