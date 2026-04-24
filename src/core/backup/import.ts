import JSZip from 'jszip'
import { db } from '@/core/db'
import type { Page } from '@/types'

interface PageMeta {
  id: string
  essayId: string | null
  batchId: string
  pageIndex: number
  rotation: number
  fullPath: string
  thumbPath: string
}

interface BackupData {
  version: number
  settings: Array<{ key: string; value: unknown }>
  classes: unknown[]
  students: unknown[]
  batches: unknown[]
  essays: unknown[]
  gradingRuns: unknown[]
  pages: PageMeta[]
}

export async function importFromZip(file: Blob): Promise<void> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const dataFile = zip.file('data.json')
  if (!dataFile) throw new Error('備份檔缺少 data.json')
  const data = JSON.parse(await dataFile.async('string')) as BackupData
  if (data.version !== 1) throw new Error(`不支援的備份版本: ${data.version}`)

  // 先把所有 blob 解壓到記憶體（Dexie transaction 內不能有非 Dexie 的 async op）
  const pageRows: Page[] = []
  for (const meta of data.pages) {
    const full = zip.file(meta.fullPath)
    const thumb = zip.file(meta.thumbPath)
    if (!full || !thumb) throw new Error(`缺少圖檔：${meta.fullPath}`)
    pageRows.push({
      id: meta.id,
      essayId: meta.essayId,
      batchId: meta.batchId,
      pageIndex: meta.pageIndex,
      rotation: meta.rotation,
      imageBlob: await full.async('blob'),
      thumbnailBlob: await thumb.async('blob'),
    })
  }

  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
    await db.settings.bulkAdd(data.settings)
    await db.classes.bulkAdd(data.classes as never)
    await db.students.bulkAdd(data.students as never)
    await db.batches.bulkAdd(data.batches as never)
    await db.essays.bulkAdd(data.essays as never)
    await db.gradingRuns.bulkAdd(data.gradingRuns as never)
    await db.pages.bulkAdd(pageRows)
  })
}
