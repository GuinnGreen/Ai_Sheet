import { describe, it, expect } from 'vitest'
import { matchNameToRoster } from './name'
import type { Student } from '@/types'

const roster: Student[] = [
  { id: 's1', classId: 'c1', seatNo: 1, name: '王小明' },
  { id: 's2', classId: 'c1', seatNo: 2, name: '陳大華' },
  { id: 's3', classId: 'c1', seatNo: 3, name: '林美玲' },
]

describe('matchNameToRoster', () => {
  it('完全相符 → confidence 1', () => {
    const r = matchNameToRoster('陳大華', roster)
    expect(r.studentId).toBe('s2')
    expect(r.confidence).toBe(1)
  })

  it('一字差 → 高信心但 < 1', () => {
    const r = matchNameToRoster('陳大花', roster)
    expect(r.studentId).toBe('s2')
    expect(r.confidence).toBeGreaterThan(0.6)
    expect(r.confidence).toBeLessThan(1)
  })

  it('完全不像 → null', () => {
    const r = matchNameToRoster('外星人', roster)
    expect(r.studentId).toBeNull()
  })

  it('空輸入 → null', () => {
    expect(matchNameToRoster('', roster).studentId).toBeNull()
    expect(matchNameToRoster(null, roster).studentId).toBeNull()
  })
})
