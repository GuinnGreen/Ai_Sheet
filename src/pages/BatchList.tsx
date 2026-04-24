import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { listClasses } from '@/core/repos/classes'
import { createBatch, deleteBatch } from '@/core/repos/batches'
import { DEFAULT_RUBRIC } from '@/types'
import { db } from '@/core/db'

export function BatchList() {
  const navigate = useNavigate()
  const classes = useLiveQuery(() => listClasses(), [])
  const [classId, setClassId] = useState('')
  const [title, setTitle] = useState('')
  const [topic, setTopic] = useState('')
  const [minWords, setMinWords] = useState(500)
  const [examDate, setExamDate] = useState(
    new Date().toISOString().slice(0, 10),
  )

  const allBatches = useLiveQuery(
    () => db.batches.orderBy('createdAt').reverse().toArray(),
    [],
  )

  async function create() {
    if (!classId || !title || !topic) return
    const b = await createBatch({
      classId,
      title,
      topic,
      minWords,
      examDate,
      rubric: DEFAULT_RUBRIC,
    })
    setTitle('')
    setTopic('')
    navigate(`/batches/${b.id}`)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">批次</h1>
      <section className="p-4 border rounded bg-white space-y-2">
        <h2 className="font-semibold">建立新批次</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label>
            班級
            <select
              className="block border rounded px-2 py-1 w-full"
              value={classId}
              onChange={e => setClassId(e.target.value)}
            >
              <option value="">—</option>
              {classes?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            考試日期
            <input
              type="date"
              className="block border rounded px-2 py-1 w-full"
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
            />
          </label>
          <label>
            批次標題
            <input
              className="block border rounded px-2 py-1 w-full"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="第二學期第一次段考"
            />
          </label>
          <label>
            作文題目
            <input
              className="block border rounded px-2 py-1 w-full"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="那些未曾褪色的風景"
            />
          </label>
          <label>
            最低字數
            <input
              type="number"
              className="block border rounded px-2 py-1 w-full"
              value={minWords}
              onChange={e => setMinWords(+e.target.value)}
            />
          </label>
        </div>
        <button
          className="px-3 py-1 rounded bg-sky-600 text-white"
          onClick={() => void create()}
        >
          建立
        </button>
      </section>
      <section>
        <h2 className="font-semibold mb-2">全部批次</h2>
        {allBatches?.length === 0 ? (
          <p className="text-sm text-slate-600">尚無批次。</p>
        ) : (
          <ul className="space-y-1">
            {allBatches?.map(b => (
              <li
                key={b.id}
                className="flex items-center justify-between border rounded px-3 py-2"
              >
                <Link className="underline" to={`/batches/${b.id}`}>
                  {b.title} — {b.topic}
                </Link>
                <div className="flex gap-3 items-center text-xs text-slate-500">
                  <span>{b.status}</span>
                  <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                  <button
                    className="text-red-600"
                    onClick={() => {
                      if (confirm('刪除整個批次（含圖片、分數、評語）？'))
                        void deleteBatch(b.id)
                    }}
                  >
                    刪除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
