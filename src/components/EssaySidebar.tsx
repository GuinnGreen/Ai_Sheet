import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import { cn } from '@/lib/utils'
import type { Essay } from '@/types'

interface SidebarItem {
  essay: Essay
  student?: { seatNo: number; name: string }
}

export function EssaySidebar(props: {
  batchId: string
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const items = useLiveQuery<SidebarItem[]>(
    async () => {
      const list = await db.essays
        .where('batchId')
        .equals(props.batchId)
        .toArray()
      const studentIds = list
        .map(e => e.studentId)
        .filter((x): x is string => Boolean(x))
      const students = studentIds.length
        ? await db.students.where('id').anyOf(studentIds).toArray()
        : []
      const stuMap = new Map(students.map(s => [s.id, s]))
      return list
        .map(e => ({
          essay: e,
          student: e.studentId ? stuMap.get(e.studentId) : undefined,
        }))
        .sort(
          (a, b) =>
            (a.student?.seatNo ?? 9999) - (b.student?.seatNo ?? 9999),
        )
    },
    [props.batchId],
  )

  return (
    <aside className="border rounded bg-white max-h-[75vh] overflow-auto">
      <ul>
        {items?.map(({ essay, student }) => {
          const icon =
            essay.studentId === null
              ? '⚠️'
              : essay.status === 'reviewed'
                ? '✅'
                : essay.status === 'graded'
                  ? '🟡'
                  : '⬜'
          const scoreTotal = essay.teacherScores?.total ?? essay.aiScores?.total
          return (
            <li key={essay.id}>
              <button
                className={cn(
                  'w-full text-left px-3 py-2 border-b text-sm flex justify-between hover:bg-slate-50',
                  props.selectedId === essay.id && 'bg-sky-50',
                )}
                onClick={() => props.onSelect(essay.id)}
              >
                <span>
                  {icon}
                  {student
                    ? `${String(student.seatNo).padStart(2, '0')} ${student.name}`
                    : `未指派 (${essay.ocrName ?? '?'})`}
                </span>
                <span className="tabular-nums">
                  {scoreTotal?.toFixed(1) ?? '—'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
