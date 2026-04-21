import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { createClass, listClasses, deleteClass } from './classes'

describe('classes repo', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('createClass 產生 uuid 並存入', async () => {
    const c = await createClass({ name: '六年十班', grade: 6, schoolYear: '114-2' })
    expect(c.id).toMatch(/^[0-9a-f-]{36}$/)
    const all = await listClasses()
    expect(all).toHaveLength(1)
  })

  it('deleteClass 連帶刪除底下的學生', async () => {
    const c = await createClass({ name: 'A', grade: 6, schoolYear: '114-2' })
    await db.students.add({ id: 's1', classId: c.id, seatNo: 1, name: '王' })
    await deleteClass(c.id)
    expect(await db.students.count()).toBe(0)
  })
})
