import { useEffect, useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getBatch } from '@/core/repos/batches'
import { getApiKey, getSelectedModel } from '@/core/repos/settings'
import { splitPdf } from '@/core/pdf/splitter'
import { addPage } from '@/core/repos/pages'
import { updateEssay } from '@/core/repos/essays'
import { runGroupingPhase, runGradingPhase } from '@/core/ai/orchestrator'
import { db } from '@/core/db'
import { EssaySidebar } from '@/components/EssaySidebar'
import { EssayPanel } from '@/components/EssayPanel'

export function BatchWorkbench() {
  const { batchId = '' } = useParams()
  const batch = useLiveQuery(() => getBatch(batchId), [batchId])
  const essays = useLiveQuery(
    () => db.essays.where('batchId').equals(batchId).toArray(),
    [batchId],
  )
  const [selectedEssayId, setSelectedEssayId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string>('')

  const essayIds = useMemo(() => essays?.map(e => e.id) ?? [], [essays])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      const idx = selectedEssayId ? essayIds.indexOf(selectedEssayId) : -1
      if (e.key === 'ArrowRight' && idx < essayIds.length - 1) {
        setSelectedEssayId(essayIds[idx + 1])
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        setSelectedEssayId(essayIds[idx - 1])
      } else if (e.key === 'Enter' && selectedEssayId) {
        void updateEssay(selectedEssayId, { status: 'reviewed' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [essayIds, selectedEssayId])

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const apiKey = await getApiKey()
    const model = await getSelectedModel()
    if (!apiKey) {
      setBusy('請先於設定頁輸入 API key')
      return
    }
    setBusy('PDF 拆頁中...')
    try {
      const splitted = await splitPdf(f)
      for (const p of splitted) {
        await addPage({
          batchId,
          essayId: null,
          pageIndex: p.pageIndex,
          imageBlob: p.fullBlob,
          thumbnailBlob: p.thumbBlob,
          rotation: p.rotation,
        })
      }
      setBusy('AI 分組與辨識姓名中...')
      await runGroupingPhase({ batchId, apiKey, model })
      setBusy('')
    } catch (err) {
      setBusy('錯誤：' + String(err).slice(0, 120))
    }
  }

  async function onGradeAll() {
    const apiKey = await getApiKey()
    const model = await getSelectedModel()
    if (!apiKey) {
      setBusy('請先於設定頁輸入 API key')
      return
    }
    try {
      await runGradingPhase({
        batchId,
        apiKey,
        model,
        onProgress: (d, t) => setBusy(`評分中 ${d}/${t}`),
      })
      setBusy('')
    } catch (err) {
      setBusy('錯誤：' + String(err).slice(0, 120))
    }
  }

  if (!batch) return <p>Loading...</p>
  const hasPages = (essays?.length ?? 0) > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{batch.title}</h1>
          <p className="text-sm text-slate-600">
            題目：{batch.topic}　狀態：{batch.status}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/batches/${batchId}/report`}
            className="px-3 py-1 rounded border"
          >
            班級報告
          </Link>
          <button
            className="px-3 py-1 rounded bg-sky-600 text-white disabled:opacity-50"
            onClick={() => void onGradeAll()}
            disabled={!hasPages || !!busy}
          >
            評分全部
          </button>
        </div>
      </div>
      {!hasPages ? (
        <div className="border rounded p-6 bg-white">
          <label className="cursor-pointer">
            <span className="px-4 py-2 rounded bg-slate-900 text-white">
              上傳作文 PDF
            </span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={onUpload}
            />
          </label>
          <p className="text-sm text-slate-600 mt-2">
            掃描雙面 PDF。系統會自動拆頁、辨識姓名與分組。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[260px_1fr] gap-3">
          <EssaySidebar
            batchId={batchId}
            selectedId={selectedEssayId}
            onSelect={setSelectedEssayId}
          />
          <EssayPanel essayId={selectedEssayId} batchId={batchId} />
        </div>
      )}
      {busy && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-3 py-2 rounded shadow-lg">
          {busy}
        </div>
      )}
    </div>
  )
}
