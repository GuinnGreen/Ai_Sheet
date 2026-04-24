import JSZip from 'jszip'
import { db } from '@/core/db'

export async function exportAllAsZip(): Promise<Blob> {
  const zip = new JSZip()
  const [settings, classes, students, batches, essays, gradingRuns, pages] =
    await Promise.all([
      db.settings.toArray(),
      db.classes.toArray(),
      db.students.toArray(),
      db.batches.toArray(),
      db.essays.toArray(),
      db.gradingRuns.toArray(),
      db.pages.toArray(),
    ])

  const pagesMeta = pages.map(p => ({
    id: p.id,
    essayId: p.essayId,
    batchId: p.batchId,
    pageIndex: p.pageIndex,
    rotation: p.rotation,
    fullPath: `images/${p.id}.jpg`,
    thumbPath: `images/${p.id}.thumb.jpg`,
  }))

  zip.file(
    'data.json',
    JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: settings.filter(s => s.key !== 'apiKey'), // 不匯出 API key
        classes,
        students,
        batches,
        essays,
        gradingRuns,
        pages: pagesMeta,
      },
      null,
      2,
    ),
  )
  for (const p of pages) {
    // 轉為 ArrayBuffer：happy-dom 的 Blob 在 JSZip 中偵測不到型別
    zip.file(`images/${p.id}.jpg`, await p.imageBlob.arrayBuffer())
    zip.file(`images/${p.id}.thumb.jpg`, await p.thumbnailBlob.arrayBuffer())
  }
  return zip.generateAsync({ type: 'blob' })
}

export async function downloadBackup() {
  const blob = await exportAllAsZip()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  a.href = url
  a.download = `essay-grader-backup-${stamp}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
