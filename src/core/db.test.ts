import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './db'

describe('EssayGraderDB', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('stores and retrieves a class', async () => {
    await db.classes.add({
      id: 'c1', name: '六年十班', grade: 6,
      schoolYear: '114-2', createdAt: Date.now(),
    })
    const c = await db.classes.get('c1')
    expect(c?.name).toBe('六年十班')
  })
})
