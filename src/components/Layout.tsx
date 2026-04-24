import { Link, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const nav = [
  { to: '/', label: '首頁' },
  { to: '/classes', label: '班級' },
  { to: '/batches', label: '批次' },
  { to: '/settings', label: '設定' },
]

export function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto flex items-center gap-6 px-4 h-14">
          <span className="font-bold text-lg">AI 作文評分</span>
          <nav className="flex gap-3 text-sm">
            {nav.map(n => (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  'px-2 py-1 rounded hover:bg-slate-100',
                  pathname === n.to &&
                    'bg-slate-900 text-white hover:bg-slate-900',
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
