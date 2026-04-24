import { describe, it, expect } from 'vitest'
import { resolveRotation, jpegBlobTargetSize } from './splitter'

describe('resolveRotation', () => {
  it('回傳值在 0/90/180/270 之間', () => {
    expect(resolveRotation(0)).toBe(0)
    expect(resolveRotation(90)).toBe(90)
    expect(resolveRotation(270)).toBe(270)
    expect(resolveRotation(360)).toBe(0)
    expect(resolveRotation(-90)).toBe(270)
    expect(resolveRotation(450)).toBe(90)
  })
})

describe('jpegBlobTargetSize', () => {
  it('按長邊縮放保持比例', () => {
    expect(jpegBlobTargetSize(2000, 1000, 800)).toEqual({ w: 800, h: 400 })
    expect(jpegBlobTargetSize(600, 800, 800)).toEqual({ w: 600, h: 800 })
  })
})
