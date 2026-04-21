import { db } from '../db'
import type { Page } from '@/types'

export async function addPage(
  input: Omit<Page, 'id'>
): Promise<Page> {
  const p: Page = { ...input, id: crypto.randomUUID() }
  await db.pages.add(p)
  return p
}

export async function getPage(id: string) { return db.pages.get(id) }

export async function listPagesByBatch(batchId: string) {
  return db.pages.where('batchId').equals(batchId).sortBy('pageIndex')
}

export async function updatePage(id: string, patch: Partial<Page>) {
  await db.pages.update(id, patch)
}
