import { NavLink } from 'react-router-dom'

interface NavItem {
  label: string
  to: string
  ready: boolean
  sprint?: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/', ready: true },
  { label: 'Peta', to: '/map', ready: true },
  { label: 'Proyek', to: '/projects', ready: true },
  { label: 'Survei', to: '/surveys', ready: false, sprint: 'Sprint 3' },
  { label: 'Bidang Tanah', to: '/parcels', ready: false, sprint: 'Sprint 4' },
  { label: 'Validasi', to: '/validation', ready: false, sprint: 'Sprint 5' },
  { label: 'Laporan', to: '/reports', ready: false, sprint: 'Sprint 6' },
  { label: 'Pengguna', to: '/users', ready: false, sprint: 'Sprint 7' },
]

export function Sidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-5">
        <div
          className="flex size-10 items-center justify-center rounded-lg bg-emerald-500 text-base font-bold text-slate-900"
          aria-hidden="true"
        >
          IS
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-wide">ISMW</p>
          <p className="truncate text-xs text-slate-400">Survey &amp; Mapping</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Navigasi utama">
        <ul className="space-y-1">
          {navItems.map((item) =>
            item.ready ? (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                      isActive
                        ? 'bg-slate-800 font-medium text-white'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    }`
                  }
                >
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ) : (
              <li
                key={item.to}
                aria-disabled="true"
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-500"
              >
                <span>{item.label}</span>
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                  {item.sprint}
                </span>
              </li>
            ),
          )}
        </ul>
      </nav>

      <div className="border-t border-slate-800 px-5 py-4 text-xs text-slate-500">
        Sprint 3A — Proyek
      </div>
    </aside>
  )
}
