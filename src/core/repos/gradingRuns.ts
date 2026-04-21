import { db } from '../db'
import type { GradingRun } from '@/types'

export async function recordGradingRun(
  input: Omit<GradingRun, 'id' | 'createdAt'>
): Promise<GradingRun> {
  const r: GradingRun = { ...input, id: crypto.randomUUID(), createdAt: Date.now() }
  await db.gradingRuns.add(r)
  return r
}

export async function listGradingRunsByEssay(essayId: string) {
  return db.gradingRuns
    .where('essayId').equals(essayId)
    .reverse().sortBy('createdAt')
}
