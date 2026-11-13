import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Alert } from '@/components/ui/Alert'
import { buttonClass } from '@/components/ui/buttonStyles'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Pagination } from '@/components/ui/Pagination'
import { Select } from '@/components/ui/Select'
import { formatArea } from '@/features/map/format'
import { useProjects } from '@/features/projects/hooks'
import { useSurveys } from '@/features/surveys/hooks'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

import { ParcelStatusBadge } from './components/ParcelStatusBadge'
import { useParcels } from './hooks'
import { PARCEL_STATUS_OPTIONS } from './types'

export function ParcelsPage() {
  const [search, setSearch] = useState('')
  const [projectId, setProjectId] = useState('')
  const [surveyId, setSurveyId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search)

  const projectsQuery = useProjects({ per_page: 100, sort: 'name', order: 'asc' })
  const surveysQuery = useSurveys({
    project_id: projectId || undefined,
    per_page: 100,
    sort: 'created_at',
    order: 'desc',
  })

  const { data, isPending, isError, error, isFetching } = useParcels({
    project_id: projectId,
    survey_id: surveyId,
    status,
    q: debouncedSearch,
    page,
    per_page: 10,
    sort: 'created_at',
    order: 'desc',
  })

  const parcels = data?.items ?? []
  const meta = data?.meta
  const projectNames = new Map(
    (projectsQuery.data?.items ?? []).map((project) => [project.id, project.name]),
  )

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Bidang Tanah"
        description="Digitasi, atribut, status, dan riwayat versi bidang tanah."
        actions={
          <Link to="/parcels/new" className={buttonClass('primary')}>
            Bidang baru
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
          placeholder="Cari kode atau penggunaan…"
          aria-label="Cari bidang"
          className="max-w-56"
        />
        <Select
          value={projectId}
          onChange={(event) => {
            setProjectId(event.target.value)
            setSurveyId('')
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
          value={surveyId}
          onChange={(event) => {
            setSurveyId(event.target.value)
            setPage(1)
          }}
          aria-label="Filter survei"
          className="max-w-52"
          disabled={!projectId}
        >
          <option value="">Semua survei</option>
          {(surveysQuery.data?.items ?? []).map((survey) => (
            <option key={survey.id} value={survey.id}>
              {survey.name}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(1)
          }}
          aria-label="Filter status bidang"
          className="max-w-40"
        >
          <option value="">Semua status</option>
          {PARCEL_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        {isFetching ? <span className="text-xs text-slate-500">Memuat…</span> : null}
      </div>

      {isError ? (
        <Alert tone="danger" title="Gagal memuat bidang">
          {error instanceof Error ? error.message : 'Terjadi kesalahan.'}
        </Alert>
      ) : null}

      {isPending ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Memuat bidang…
        </div>
      ) : parcels.length === 0 ? (
        <EmptyState
          title="Belum ada bidang tanah"
          description="Buat bidang baru, lalu digitasi polygon dan lengkapi atributnya."
          action={
            <Link to="/parcels/new" className={buttonClass('primary')}>
              Bidang baru
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Proyek</th>
                  <th className="px-4 py-3 font-medium">Penggunaan</th>
                  <th className="px-4 py-3 font-medium">Luas</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Versi</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parcels.map((parcel) => (
                  <tr key={parcel.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/parcels/${parcel.id}`}
                        className="font-medium text-slate-800 hover:underline"
                      >
                        {parcel.parcel_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {projectNames.get(parcel.project_id) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{parcel.land_use || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatArea(parcel.area_m2)}</td>
                    <td className="px-4 py-3">
                      <ParcelStatusBadge status={parcel.verification_status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">v{parcel.current_version}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/parcels/${parcel.id}`}
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
