import { Link } from 'react-router-dom'

import { StatusBadge } from '@/components/ui/StatusBadge'

import { HealthStatusCard } from '@/features/system/HealthStatusCard'

interface ModuleCard {
  name: string
  sprint: string
  ready: boolean
  to?: string
}

const modules: ModuleCard[] = [
  { name: 'Project Management', sprint: 'Sprint 3', ready: true, to: '/projects' },
  { name: 'GIS Map Viewer', sprint: 'Sprint 2', ready: true, to: '/map' },
  { name: 'Survey Management', sprint: 'Sprint 3', ready: false },
  { name: 'Parcel Management', sprint: 'Sprint 4', ready: false },
  { name: 'Spatial Validation', sprint: 'Sprint 5', ready: false },
  { name: 'Media & Geotagging', sprint: 'Sprint 6', ready: false },
  { name: 'Reporting & Export', sprint: 'Sprint 6', ready: false },
  { name: 'Users & Security', sprint: 'Sprint 7', ready: false },
]

export function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Fondasi sistem: monorepo, database PostGIS, REST API, dan aplikasi web.
        </p>
      </header>

      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
        Modul Peta dan Proyek tersedia. Modul survei dan bidang tanah sedang dikerjakan; kartu
        yang belum tersedia tidak menampilkan data tiruan.
      </div>

      <HealthStatusCard />

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Kesiapan modul
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((module) => (
            <li
              key={module.name}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              {module.ready && module.to ? (
                <Link
                  to={module.to}
                  className="text-sm font-medium text-slate-900 hover:underline"
                >
                  {module.name}
                </Link>
              ) : (
                <p className="text-sm font-medium text-slate-900">{module.name}</p>
              )}
              <div className="mt-3 flex items-center justify-between">
                <StatusBadge tone={module.ready ? 'success' : 'neutral'}>
                  {module.ready ? 'Tersedia' : 'Belum tersedia'}
                </StatusBadge>
                <span className="text-xs text-slate-500">{module.sprint}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
