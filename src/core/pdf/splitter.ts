import { pdfjs } from './pdfjs-init'
import type { PDFPageProxy } from 'pdfjs-dist'

export interface SplitResult {
  pageIndex: number
  fullBlob: Blob
  thumbBlob: Blob
  rotation: number
  width: number
  height: number
}

export function resolveRotation(deg: number): 0 | 90 | 180 | 270 {
  const r = ((deg % 360) + 360) % 360
  return r as 0 | 90 | 180 | 270
}

export function jpegBlobTargetSize(w: number, h: number, maxEdge: number) {
  if (Math.max(w, h) <= maxEdge) return { w, h }
  const scale = maxEdge / Math.max(w, h)
  return { w: Math.round(w * scale), h: Math.round(h * scale) }
}

async function renderToBlob(
  page: PDFPageProxy,
  scale: number,
  rotation: number,
): Promise<{ blob: Blob; w: number; h: number }> {
  const viewport = page.getViewport({ scale, rotation })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, viewport }).promise
  const blob: Blob = await new Promise((res, rej) =>
    canvas.toBlob(
      b => (b ? res(b) : rej(new Error('canvas.toBlob 回傳 null'))),
      'image/jpeg',
      0.85,
    ),
  )
  return { blob, w: canvas.width, h: canvas.height }
}

export async function splitPdf(file: File): Promise<SplitResult[]> {
  const buf = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buf }).promise
  const out: SplitResult[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const rotation = resolveRotation(page.rotate)
    const full = await renderToBlob(page, 2.0, rotation)
    const thumb = await renderToBlob(page, 0.6, rotation)
    out.push({
      pageIndex: i,
      fullBlob: full.blob,
      thumbBlob: thumb.blob,
      rotation,
      width: full.w,
      height: full.h,
    })
  }
  await doc.cleanup()
  return out
}
