import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { getBatch } from '@/core/repos/batches'
import { listEssaysByBatch } from '@/core/repos/essays'
import { listStudents } from '@/core/repos/students'
import { computeStats } from '@/core/stats/classwide'
import { exportToExcel } from '@/core/exports/excel'
import { exportToPdf } from '@/core/exports/pdf'
import type { Essay, Student } from '@/types'

export function BatchReport() {
  const { batchId = '' } = useParams()
  const batch = useLiveQuery(() => getBatch(batchId), [batchId])
  const essays = useLiveQuery<Essay[]>(
    async () => await listEssaysByBatch(batchId),
    [batchId],
  )
  const roster = useLiveQuery<Student[]>(
    async () => (batch ? await listStudents(batch.classId) : []),
    [batch?.id],
  )
  const [exporting, setExporting] = useState(false)
  const [err, setErr] = useState('')

  if (!batch || !essays || !roster) return <p>Loading...</p>
  const stats = computeStats(
    essays,
    batch.rubric.dimensions.map(d => d.name),
  )
  const studentMap = new Map(roster.map(s => [s.id, s]))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            {batch.title} — 班級報告
          </h1>
          <p className="text-sm text-slate-600">
            題目：{batch.topic}　已評分 {stats.n}/{essays.length} 人　平均
            {' '}
            {stats.totalDistribution.mean.toFixed(2)} / 6
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/batches/${batchId}`}
            className="px-3 py-1 rounded border"
          >
            回工作台
          </Link>
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            disabled={exporting}
            onClick={async () => {
              setExporting(true)
              setErr('')
              try {
                await exportToExcel(batch, essays, roster)
              } catch (e) {
                setErr(String(e))
              }
              setExporting(false)
            }}
          >
            匯出 Excel
          </button>
          <button
            className="px-3 py-1 rounded border disabled:opacity-50"
            disabled={exporting}
            onClick={async () => {
              setExporting(true)
              setErr('')
              try {
                await exportToPdf(batch, essays, roster, stats)
              } catch (e) {
                setErr(String(e))
              }
              setExporting(false)
            }}
          >
            匯出 PDF
          </button>
        </div>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <section>
        <h2 className="font-semibold mb-2">總分分布</h2>
        <div className="h-48 bg-white border rounded p-2">
          <ResponsiveContainer>
            <BarChart
              data={stats.totalDistribution.histogram.map((v, i) => ({
                score: i,
                count: v,
              }))}
            >
              <XAxis dataKey="score" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0284c7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      {stats.typoRanking.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">錯字排行（Top 20）</h2>
          <ul className="grid grid-cols-2 gap-1 text-sm">
            {stats.typoRanking.map(t => (
              <li
                key={t.wrong + t.correct}
                className="border rounded px-2 py-1"
              >
                <b>{t.wrong}</b> → {t.correct}　×{t.count}
                <span className="text-xs text-slate-500 ml-1">
                  (
                  {t.studentIds
                    .map(id => studentMap.get(id)?.name)
                    .filter(Boolean)
                    .join('、')}
                  )
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {stats.highlights.length > 0 && (
        <section>
          <h2 className="font-semibold mb-2">佳句選錄</h2>
          <ul className="space-y-1">
            {stats.highlights.slice(0, 10).map((h, i) => (
              <li key={i} className="text-sm">
                「{h.text}」
                <span className="text-xs text-slate-500 ml-2">
                  —{' '}
                  {h.studentId ? studentMap.get(h.studentId)?.name : '未指派'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
