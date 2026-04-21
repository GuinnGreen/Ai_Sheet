import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'

if (typeof structuredClone === 'undefined') {
  globalThis.structuredClone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T
}
