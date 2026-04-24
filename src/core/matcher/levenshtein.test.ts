import { describe, it, expect } from 'vitest'
import { levenshtein } from './levenshtein'

describe('levenshtein', () => {
  it('相同字串為 0', () => { expect(levenshtein('王小明', '王小明')).toBe(0) })
  it('一字差為 1', () => { expect(levenshtein('王小明', '王小民')).toBe(1) })
  it('空字串', () => { expect(levenshtein('', '王')).toBe(1) })
  it('不同長度', () => { expect(levenshtein('陳', '陳大華')).toBe(2) })
})
