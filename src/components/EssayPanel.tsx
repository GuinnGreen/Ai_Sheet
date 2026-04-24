import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/core/db'
import { getEssay, updateEssay } from '@/core/repos/essays'
import { getBatch } from '@/core/repos/batches'
import { listStudents } from '@/core/repos/students'
import type { Page, RubricScores, Student } from '@/types'

export function EssayPanel(props: {
  essayId: string | null
  batchId: string
}) {
  const essay = useLiveQuery(
    () => (props.essayId ? getEssay(props.essayId) : undefined),
    [props.essayId],
  )
  const batch = useLiveQuery(() => getBatch(props.batchId), [props.batchId])
  const roster = useLiveQuery<Student[]>(
    async () => (batch ? await listStudents(batch.classId) : []),
    [batch?.id],
  )
  const pages = useLiveQuery<Page[]>(
    async () =>
      essay
        ? await db.pages.where('id').anyOf(essay.pageIds).sortBy('pageIndex')
        : [],
    [essay?.id],
  )

  const [imageUrls, setImageUrls] = useState<string[]>([])
  useEffect(() => {
    if (!pages) return
    const urls = pages.map(p => URL.createObjectURL(p.imageBlob))
    setImageUrls(urls)
    return () => urls.forEach(URL.revokeObjectURL)
  }, [pages])

  if (!essay || !batch) {
    return (
      <div className="p-4 border rounded bg-white text-slate-500">
        請從左側選擇一份作文
      </div>
    )
  }

  const finalScores: RubricScores | null = essay.teacherScores ?? essay.aiScores
  const dims = batch.rubric.dimensions

  async function updateDim(name: string, value: number) {
    const base: RubricScores = finalScores ?? {
      dimensionScores: {},
      typoDeduction: 0,
      lengthDeduction: 0,
      total: 0,
    }
    const next: RubricScores = {
      ...base,
      dimensionScores: { ...base.dimensionScores, [name]: value },
    }
    next.total =
      Object.values(next.dimensionScores).reduce((a, b) => a + b, 0) -
      next.typoDeduction -
      next.lengthDeduction
    if (essay) await updateEssay(essay.id, { teacherScores: next })
  }

  async function setComment(c: string) {
    if (essay) await updateEssay(essay.id, { teacherComment: c })
  }

  async function setStudentId(id: string) {
    if (essay) await updateEssay(essay.id, { studentId: id || null })
  }

  async function markReviewed() {
    if (essay) await updateEssay(essay.id, { status: 'reviewed' })
  }

  return (
    <div className="grid grid-cols-[1fr_340px] gap-3">
      <div className="space-y-2">
        {imageUrls.map((u, i) => (
          <img
            key={u}
            src={u}
            alt={`page ${i + 1}`}
            className="w-full border rounded bg-white"
          />
        ))}
      </div>
      <aside className="space-y-4">
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            指派學生（AI: {essay.ocrName ?? '—'}, 信心
            {' '}
            {essay.matchConfidence.toFixed(2)}）
          </label>
          <select
            value={essay.studentId ?? ''}
            className="border rounded px-2 py-1 w-full"
            onChange={e => void setStudentId(e.target.value)}
          >
            <option value="">— 未指派 —</option>
            {roster?.map(s => (
              <option key={s.id} value={s.id}>
                {String(s.seatNo).padStart(2, '0')} {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <h3 className="font-semibold mb-1">分數</h3>
          {dims.map(d => (
            <div key={d.name} className="flex items-center gap-2 text-sm">
              <span className="w-20">{d.name}</span>
              <input
                type="number"
                step="0.5"
                min={0}
                max={d.maxScore}
                className="border rounded px-1 py-0.5 w-20"
                value={finalScores?.dimensionScores[d.name] ?? ''}
                onChange={e => void updateDim(d.name, Number(e.target.value))}
              />
              <span className="text-slate-500">/ {d.maxScore}</span>
            </div>
          ))}
          <div className="text-sm mt-1 text-slate-600">
            扣分：錯字 {finalScores?.typoDeduction ?? 0} 　字數
            {' '}
            {finalScores?.lengthDeduction ?? 0}
          </div>
          <div className="text-lg font-semibold mt-1">
            總分 {finalScores?.total?.toFixed(1) ?? '—'} / 6
          </div>
        </div>
        <div>
          <h3 className="font-semibold mb-1">評語</h3>
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={5}
            value={essay.teacherComment ?? essay.aiComment ?? ''}
            onChange={e => void setComment(e.target.value)}
          />
        </div>
        {essay.aiTypos.length > 0 && (
          <div>
            <h3 className="font-semibold mb-1">錯別字</h3>
            <ul className="text-sm space-y-0.5">
              {essay.aiTypos.map((t, i) => (
                <li key={i}>
                  <b>{t.wrong}</b> → {t.correct}
                  {t.context && (
                    <span className="text-slate-500">（{t.context}）</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {essay.aiHighlights.length > 0 && (
          <div>
            <h3 className="font-semibold mb-1">佳句</h3>
            <ul className="text-sm list-disc pl-4">
              {essay.aiHighlights.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          className="px-3 py-1 rounded bg-slate-900 text-white w-full"
          onClick={() => void markReviewed()}
        >
          標記已完成
        </button>
      </aside>
    </div>
  )
}
