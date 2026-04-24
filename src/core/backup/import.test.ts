import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '@/core/db'
import { createClass } from '@/core/repos/classes'
import { addPage } from '@/core/repos/pages'
import { exportAllAsZip } from './export'
import { importFromZip } from './import'

describe('importFromZip', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('匯出後清庫再匯入，資料一致', async () => {
    await createClass({ name: 'A', grade: 6, schoolYear: '114-2' })
    await addPage({
      batchId: 'b',
      essayId: null,
      pageIndex: 1,
      imageBlob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
      thumbnailBlob: new Blob([new Uint8Array([4])], { type: 'image/jpeg' }),
      rotation: 0,
    })
    const blob = await exportAllAsZip()
    await db.delete()
    await db.open()
    await importFromZip(blob)
    expect(await db.classes.count()).toBe(1)
    expect(await db.pages.count()).toBe(1)
    const p = (await db.pages.toArray())[0]
    expect(p.imageBlob.size).toBe(3)
    expect(p.thumbnailBlob.size).toBe(1)
  })

  it('版本不對時拋錯', async () => {
    const zip = new (await import('jszip')).default()
    zip.file('data.json', JSON.stringify({ version: 99, pages: [] }))
    const blob = await zip.generateAsync({ type: 'blob' })
    await expect(importFromZip(blob)).rejects.toThrow(/不支援的備份版本/)
  })
})
