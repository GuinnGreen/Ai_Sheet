import { db } from '../db'
import type { Class } from '@/types'

export async function createClass(
  input: Omit<Class, 'id' | 'createdAt'>
): Promise<Class> {
  const c: Class = { ...input, id: crypto.randomUUID(), createdAt: Date.now() }
  await db.classes.add(c)
  return c
}

export async function listClasses(): Promise<Class[]> {
  return db.classes.orderBy('name').toArray()
}

export async function getClass(id: string) {
  return db.classes.get(id)
}

export async function updateClass(id: string, patch: Partial<Class>) {
  await db.classes.update(id, patch)
}

export async function deleteClass(id: string) {
  await db.transaction('rw', db.classes, db.students, async () => {
    await db.students.where('classId').equals(id).delete()
    await db.classes.delete(id)
  })
}
