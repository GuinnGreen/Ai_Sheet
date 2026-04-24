import { describe, it, expect, beforeEach } from 'vitest'
import JSZip from 'jszip'
import { db } from '@/core/db'
import { createClass } from '@/core/repos/classes'
import { addPage } from '@/core/repos/pages'
import { setApiKey } from '@/core/repos/settings'
import { exportAllAsZip } from './export'

describe('exportAllAsZip', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('匯出 classes 與 page blobs', async () => {
    const c = await createClass({ name: 'A', grade: 6, schoolYear: '114-2' })
    await addPage({
      batchId: 'b',
      essayId: null,
      pageIndex: 1,
      imageBlob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }),
      thumbnailBlob: new Blob([new Uint8Array([4])], { type: 'image/jpeg' }),
      rotation: 0,
    })
    const blob = await exportAllAsZip()
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const dataJson = await zip.file('data.json')!.async('string')
    const parsed = JSON.parse(dataJson)
    expect(parsed.classes[0].id).toBe(c.id)
    expect(parsed.version).toBe(1)
    expect(Object.keys(zip.files).some(k => k.startsWith('images/'))).toBe(true)
  })

  it('不匯出 API key 到 settings', async () => {
    await setApiKey('AIza-secret')
    const blob = await exportAllAsZip()
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())
    const dataJson = await zip.file('data.json')!.async('string')
    const parsed = JSON.parse(dataJson)
    const keys = parsed.settings.map((s: { key: string }) => s.key)
    expect(keys).not.toContain('apiKey')
  })
})
