import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

// happy-dom/jsdom 的 structuredClone 不支援 Blob（clone 後資料遺失），
// 導致 fake-indexeddb 的 Blob round-trip 失敗。這裡提供一個能保留
// Blob bytes 的 structuredClone（僅供測試環境）。真實瀏覽器的
// IndexedDB 原生支援 Blob，不受影響。
globalThis.structuredClone = function testStructuredClone<T>(value: T): T {
  return deepClone(value) as T
}
function deepClone(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v
  if (v instanceof Blob) {
    const anyBlob = v as unknown as {
      _buffer?: ArrayBuffer
      _state?: { buffer?: ArrayBuffer }
    }
    const buf = anyBlob._buffer ?? anyBlob._state?.buffer
    if (buf) return new Blob([buf.slice(0)], { type: v.type })
    return v // 退回（測試會顯示資料不足）
  }
  if (Array.isArray(v)) return v.map(deepClone)
  if (v instanceof Map) {
    return new Map([...v].map(([k, vv]) => [deepClone(k), deepClone(vv)]))
  }
  if (v instanceof Set) return new Set([...v].map(deepClone))
  if (v instanceof Date) return new Date(v.getTime())
  if (v instanceof ArrayBuffer) return v.slice(0)
  if (ArrayBuffer.isView(v)) {
    const t = v as unknown as {
      buffer: ArrayBuffer
      byteOffset: number
      byteLength: number
      constructor: new (b: ArrayBuffer, o: number, l: number) => unknown
    }
    return new t.constructor(
      t.buffer.slice(t.byteOffset, t.byteOffset + t.byteLength),
      0,
      t.byteLength,
    )
  }
  const proto = Object.getPrototypeOf(v)
  const out: Record<string, unknown> = proto ? Object.create(proto) : {}
  for (const k of Object.keys(v as object)) {
    out[k] = deepClone((v as Record<string, unknown>)[k])
  }
  return out
}
