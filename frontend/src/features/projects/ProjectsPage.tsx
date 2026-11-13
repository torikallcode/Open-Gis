import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert } from '@/components/ui/Alert'
import { buttonClass } from '@/components/ui/buttonStyles'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

import { ProjectStatusBadge } from './components/ProjectStatusBadge'
import { crsLabel } from './crs'
import { useProjects } from './hooks'
import { PROJECT_STATUS_OPTIONS } from './types'

export function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)

  const { data, isPending, isError, error, isFetching } = useProjects({
    q: debouncedSearch,
    status,
    page,
    per_page: 10,
    sort: 'created_at',
    order: 'desc',
  })

  const projects = data?.items ?? []
  const meta = data?.meta

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Proyek"
        description="Kelola proyek survei, CRS, dan anggota tim."
        actions={
          <Link
            to="/projects/new"
            className={buttonClass('primary')}
          >
            Proyek baru
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Cari nama, lokasi, atau deskripsi…"
          aria-label="Cari proyek"
          className="max-w-sm"
        />
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
          aria-label="Filter status"
          className="max-w-52"
        >
          <option value="">Semua status</option>
          {PROJECT_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {isFetching ? <span className="text-xs text-slate-500">Memuat…</span> : null}
      </div>

      {isError ? (
        <Alert tone="danger" title="Gagal memuat proyek">
          {error instanceof Error ? error.message : 'Terjadi kesalahan.'}
        </Alert>
      ) : null}

      {isPending ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Memuat proyek…
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="Belum ada proyek"
          description="Buat proyek pertama untuk mulai mengelola kegiatan survei."
          action={
            <Link
              to="/projects/new"
              className={buttonClass('primary')}
            >
              Proyek baru
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Proyek</th>
                  <th className="px-4 py-3 font-medium">Lokasi</th>
                  <th className="px-4 py-3 font-medium">CRS</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Periode</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/projects/${project.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {project.name}
                      </Link>
                      {project.description ? (
                        <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-slate-500">
                          {project.description}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{project.location || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{crsLabel(project.crs_epsg)}</td>
                    <td className="px-4 py-3">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {project.start_date || '—'}
                      {project.end_date ? ` → ${project.end_date}` : ''}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/projects/${project.id}`}
                        className={buttonClass('secondary', 'px-3 py-1.5 text-xs')}
                      >
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meta ? (
        <Pagination
          page={meta.page}
          totalPages={meta.total_pages}
          total={meta.total}
          perPage={meta.per_page}
          disabled={isFetching}
          onChange={setPage}
        />
      ) : null}
    </div>
  )
}
