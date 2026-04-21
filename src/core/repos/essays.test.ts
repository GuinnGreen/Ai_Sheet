import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { createEssay, updateEssay } from './essays'

describe('essays repo', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('createEssay 預設 status=pending', async () => {
    const e = await createEssay({ batchId: 'b1', pageIds: ['p1', 'p2'] })
    expect(e.status).toBe('pending')
    expect(e.studentId).toBeNull()
  })

  it('updateEssay 可寫 teacherScores', async () => {
    const e = await createEssay({ batchId: 'b1', pageIds: [] })
    await updateEssay(e.id, {
      teacherScores: { dimensionScores: { 立意取材: 2 }, typoDeduction: 0, lengthDeduction: 0, total: 2 },
      status: 'reviewed',
    })
    const got = await db.essays.get(e.id)
    expect(got?.status).toBe('reviewed')
  })
})
