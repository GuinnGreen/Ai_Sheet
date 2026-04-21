import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { createStudent, listStudents, importStudentsFromCsv } from './students'

describe('students repo', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('createStudent 與 listStudents 依座號排序', async () => {
    await createStudent({ classId: 'c1', seatNo: 3, name: '林' })
    await createStudent({ classId: 'c1', seatNo: 1, name: '王' })
    const list = await listStudents('c1')
    expect(list.map(s => s.seatNo)).toEqual([1, 3])
  })

  it('importStudentsFromCsv 解析兩欄（座號,姓名）', async () => {
    const csv = '座號,姓名\n1,王小明\n2,陳大華\n'
    const imported = await importStudentsFromCsv('c1', csv)
    expect(imported).toHaveLength(2)
    expect(imported[1].name).toBe('陳大華')
  })
})
