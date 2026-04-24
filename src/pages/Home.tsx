import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { listClasses } from '@/core/repos/classes'
import { db } from '@/core/db'
import { getApiKey } from '@/core/repos/settings'

export function Home() {
  const classes = useLiveQuery(() => listClasses(), [])
  const recentBatches = useLiveQuery(
    () => db.batches.orderBy('createdAt').reverse().limit(5).toArray(),
    [],
  )
  const apiKey = useLiveQuery(() => getApiKey(), [])

  return (
    <div className="space-y-6">
      {apiKey === null && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded">
          尚未設定 Google AI API Key。
          <Link to="/settings" className="underline ml-1">
            前往設定
          </Link>
        </div>
      )}
      <section>
        <h2 className="text-lg font-semibold mb-2">我的班級</h2>
        {classes?.length === 0 ? (
          <p className="text-sm text-slate-600">
            尚未建立班級。
            <Link to="/classes" className="underline ml-1">
              去建立
            </Link>
          </p>
        ) : (
          <ul className="space-y-1">
            {classes?.map(c => (
              <li key={c.id}>
                <Link to={`/classes/${c.id}`} className="underline">
                  {c.name}（{c.schoolYear}）
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="text-lg font-semibold mb-2">最近批次</h2>
        {recentBatches?.length === 0 ? (
          <p className="text-sm text-slate-600">尚無批次。</p>
        ) : (
          <ul className="space-y-1">
            {recentBatches?.map(b => (
              <li key={b.id}>
                <Link to={`/batches/${b.id}`} className="underline">
                  {b.title} — {b.topic}
                </Link>
                <span className="text-xs text-slate-500 ml-2">{b.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
