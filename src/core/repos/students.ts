import { db } from '../db'
import type { Student } from '@/types'

export async function createStudent(
  input: Omit<Student, 'id'>
): Promise<Student> {
  const s: Student = { ...input, id: crypto.randomUUID() }
  await db.students.add(s)
  return s
}

export async function listStudents(classId: string): Promise<Student[]> {
  return db.students.where('classId').equals(classId).sortBy('seatNo')
}

export async function updateStudent(id: string, patch: Partial<Student>) {
  await db.students.update(id, patch)
}

export async function deleteStudent(id: string) {
  await db.students.delete(id)
}

export async function importStudentsFromCsv(
  classId: string,
  csvText: string
): Promise<Student[]> {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean)
  const header = lines[0].split(',')
  const seatIdx = header.findIndex(h => /座號|seat/i.test(h))
  const nameIdx = header.findIndex(h => /姓名|name/i.test(h))
  if (seatIdx < 0 || nameIdx < 0) throw new Error('CSV 需含「座號」與「姓名」欄')
  const out: Student[] = []
  for (const line of lines.slice(1)) {
    const cells = line.split(',').map(c => c.trim())
    const seatNo = Number(cells[seatIdx])
    const name = cells[nameIdx]
    if (!Number.isFinite(seatNo) || !name) continue
    out.push(await createStudent({ classId, seatNo, name }))
  }
  return out
}
