import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { listClasses, createClass, deleteClass } from '@/core/repos/classes'

export function ClassList() {
  const classes = useLiveQuery(() => listClasses(), [])
  const [name, setName] = useState('')
  const [grade, setGrade] = useState(6)
  const [schoolYear, setSchoolYear] = useState('114-2')

  async function add() {
    if (!name.trim()) return
    await createClass({ name, grade, schoolYear })
    setName('')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">班級</h1>
      <div className="flex gap-2 items-end flex-wrap">
        <label className="text-sm">
          名稱
          <input
            className="block border rounded px-2 py-1"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="六年十班"
          />
        </label>
        <label className="text-sm">
          年級
          <input
            type="number"
            className="block border rounded px-2 py-1 w-20"
            value={grade}
            onChange={e => setGrade(+e.target.value)}
          />
        </label>
        <label className="text-sm">
          學年度
          <input
            className="block border rounded px-2 py-1 w-24"
            value={schoolYear}
            onChange={e => setSchoolYear(e.target.value)}
          />
        </label>
        <button
          className="px-3 py-1 rounded bg-sky-600 text-white"
          onClick={() => void add()}
        >
          新增
        </button>
      </div>
      <ul className="space-y-1">
        {classes?.map(c => (
          <li
            key={c.id}
            className="flex items-center justify-between border rounded px-3 py-2"
          >
            <Link className="underline" to={`/classes/${c.id}`}>
              {c.name}（{c.schoolYear}）
            </Link>
            <button
              className="text-sm text-red-600"
              onClick={() => {
                if (confirm('確認刪除整個班級？連帶刪除學生名單。'))
                  void deleteClass(c.id)
              }}
            >
              刪除
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
