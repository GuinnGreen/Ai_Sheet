import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { getClass } from '@/core/repos/classes'
import {
  listStudents,
  createStudent,
  deleteStudent,
  importStudentsFromCsv,
} from '@/core/repos/students'

export function ClassDetail() {
  const { classId = '' } = useParams()
  const cls = useLiveQuery(() => getClass(classId), [classId])
  const students = useLiveQuery(() => listStudents(classId), [classId])
  const [seatNo, setSeatNo] = useState(1)
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')

  async function add() {
    if (!name) return
    await createStudent({ classId, seatNo, name })
    setName('')
    setSeatNo(seatNo + 1)
  }

  async function onCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const text = await f.text()
      const imported = await importStudentsFromCsv(classId, text)
      setStatus(`已匯入 ${imported.length} 位學生`)
    } catch (err) {
      setStatus('匯入失敗：' + String(err))
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{cls?.name}</h1>
      <div className="flex gap-2 items-end flex-wrap">
        <label className="text-sm">
          座號
          <input
            type="number"
            className="block border rounded px-2 py-1 w-20"
            value={seatNo}
            onChange={e => setSeatNo(+e.target.value)}
          />
        </label>
        <label className="text-sm">
          姓名
          <input
            className="block border rounded px-2 py-1"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>
        <button
          className="px-3 py-1 rounded bg-sky-600 text-white"
          onClick={() => void add()}
        >
          新增
        </button>
        <label className="px-3 py-1 rounded border cursor-pointer ml-auto">
          匯入 CSV（座號,姓名）
          <input
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={onCsv}
          />
        </label>
      </div>
      {status && <p className="text-sm text-green-700">{status}</p>}
      <ul className="space-y-1">
        {students?.map(s => (
          <li
            key={s.id}
            className="flex items-center justify-between border rounded px-3 py-1"
          >
            <span>
              {s.seatNo.toString().padStart(2, '0')}　{s.name}
            </span>
            <button
              className="text-sm text-red-600"
              onClick={() => void deleteStudent(s.id)}
            >
              刪除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
