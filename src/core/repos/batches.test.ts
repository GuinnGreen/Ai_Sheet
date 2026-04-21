import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { createBatch, listBatches } from './batches'
import { DEFAULT_RUBRIC } from '@/types'

describe('batches repo', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('createBatch 設預設狀態 draft', async () => {
    const b = await createBatch({
      classId: 'c1', title: '第一次段考', topic: '那些未曾褪色的風景',
      minWords: 500, rubric: DEFAULT_RUBRIC, examDate: '2026-04-21',
    })
    expect(b.status).toBe('draft')
  })

  it('listBatches 依 createdAt 由新到舊', async () => {
    const b1 = await createBatch({
      classId: 'c1', title: 'A', topic: 't', minWords: 500,
      rubric: DEFAULT_RUBRIC, examDate: '2026-01-01',
    })
    await new Promise(r => setTimeout(r, 5))
    const b2 = await createBatch({
      classId: 'c1', title: 'B', topic: 't', minWords: 500,
      rubric: DEFAULT_RUBRIC, examDate: '2026-02-01',
    })
    const list = await listBatches('c1')
    expect(list[0].id).toBe(b2.id)
    expect(list[1].id).toBe(b1.id)
  })
})
