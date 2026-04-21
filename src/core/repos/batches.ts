import { db } from '../db'
import type { Batch, BatchStatus } from '@/types'

export async function createBatch(
  input: Omit<Batch, 'id' | 'createdAt' | 'status'>
): Promise<Batch> {
  const b: Batch = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    status: 'draft',
  }
  await db.batches.add(b)
  return b
}

export async function listBatches(classId: string): Promise<Batch[]> {
  return db.batches
    .where('classId').equals(classId)
    .reverse().sortBy('createdAt')
}

export async function getBatch(id: string) { return db.batches.get(id) }

export async function updateBatch(id: string, patch: Partial<Batch>) {
  await db.batches.update(id, patch)
}

export async function setBatchStatus(id: string, status: BatchStatus) {
  await db.batches.update(id, { status })
}

export async function deleteBatch(id: string) {
  await db.transaction('rw', db.batches, db.essays, db.pages, db.gradingRuns, async () => {
    const essays = await db.essays.where('batchId').equals(id).toArray()
    const essayIds = essays.map(e => e.id)
    await db.gradingRuns.where('essayId').anyOf(essayIds).delete()
    await db.pages.where('batchId').equals(id).delete()
    await db.essays.where('batchId').equals(id).delete()
    await db.batches.delete(id)
  })
}
