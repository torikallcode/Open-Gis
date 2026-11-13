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
import { useProjects } from '@/features/projects/hooks'

import { SurveyStatusBadge } from './components/SurveyStatusBadge'
import { useSurveys } from './hooks'
import { SURVEY_STATUS_OPTIONS } from './types'

export function SurveysPage() {
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)

  const projectsQuery = useProjects({ per_page: 100, sort: 'name', order: 'asc' })
  const { data, isPending, isError, error, isFetching } = useSurveys({
    q: debouncedSearch,
    project_id: projectId,
    status,
    from,
    to,
    page,
    per_page: 10,
    sort: 'created_at',
    order: 'desc',
  })

  const surveys = data?.items ?? []
  const meta = data?.meta

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Survei"
        description="Kelola kegiatan survei, area kerja, dan titik koordinat."
        actions={
          <Link to="/surveys/new" className={buttonClass('primary')}>
            Survei baru
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
          placeholder="Cari nama atau metode…"
          aria-label="Cari survei"
          className="max-w-64"
        />
        <Select
          value={projectId}
          onChange={(event) => {
            setProjectId(event.target.value)
            setPage(1)
          }}
          aria-label="Filter proyek"
          className="max-w-56"
        >
          <option value="">Semua proyek</option>
          {(projectsQuery.data?.items ?? []).map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
          aria-label="Filter status survei"
          className="max-w-44"
        >
          <option value="">Semua status</option>
          {SURVEY_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={from}
          onChange={(event) => {
            setFrom(event.target.value)
            setPage(1)
          }}
          aria-label="Tanggal mulai"
          className="max-w-40"
        />
        <Input
          type="date"
          value={to}
          onChange={(event) => {
            setTo(event.target.value)
            setPage(1)
          }}
          aria-label="Tanggal akhir"
          className="max-w-40"
        />
        {isFetching ? <span className="text-xs text-slate-500">Memuat…</span> : null}
      </div>

      {isError ? (
        <Alert tone="danger" title="Gagal memuat survei">
          {error instanceof Error ? error.message : 'Terjadi kesalahan.'}
        </Alert>
      ) : null}

      {isPending ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Memuat survei…
        </div>
      ) : surveys.length === 0 ? (
        <EmptyState
          title="Belum ada survei"
          description="Buat kegiatan survei di dalam proyek yang sudah ada."
          action={
            <Link to="/surveys/new" className={buttonClass('primary')}>
              Survei baru
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Survei</th>
                  <th className="px-4 py-3 font-medium">Proyek</th>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Metode</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Titik</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {surveys.map((survey) => (
                  <tr key={survey.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/surveys/${survey.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {survey.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{survey.project_name}</td>
                    <td className="px-4 py-3 text-slate-600">{survey.survey_date || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{survey.method || '—'}</td>
                    <td className="px-4 py-3">
                      <SurveyStatusBadge status={survey.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{survey.point_count}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/surveys/${survey.id}`}
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
