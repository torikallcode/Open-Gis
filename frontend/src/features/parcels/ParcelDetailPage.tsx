import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { formatArea } from '@/features/map/format'
import { useProject } from '@/features/projects/hooks'
import { useSurveyAreas } from '@/features/surveys/hooks'
import { ApiError } from '@/services/api'

import { ParcelMapEditor } from './components/ParcelMapEditor'
import { ParcelStatusBadge } from './components/ParcelStatusBadge'
import { VersionHistory } from './components/VersionHistory'
import {
  useDeleteParcel,
  useParcel,
  useParcelVersions,
  useUpdateParcelStatus,
} from './hooks'

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function ParcelDetailPage() {
  const { parcelId } = useParams()
  const navigate = useNavigate()
  const parcelQuery = useParcel(parcelId)
  const projectQuery = useProject(parcelQuery.data?.project_id)
  const versionsQuery = useParcelVersions(parcelId)
  const areasQuery = useSurveyAreas(parcelQuery.data?.project_id)
  const statusMutation = useUpdateParcelStatus(parcelId ?? '', parcelQuery.data?.project_id ?? '')
  const deleteMutation = useDeleteParcel(parcelId ?? '', parcelQuery.data?.project_id ?? '')
  const [actionError, setActionError] = useState<string | null>(null)

  if (parcelQuery.isPending) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
        <Spinner /> Memuat bidang…
      </div>
    )
  }

  if (parcelQuery.isError || !parcelQuery.data) {
    const notFound = parcelQuery.error instanceof ApiError && parcelQuery.error.status === 404

    return (
      <EmptyState
        title={notFound ? 'Bidang tidak ditemukan' : 'Bidang tidak dapat dimuat'}
        description={
          notFound
            ? 'Bidang mungkin sudah dihapus atau Anda tidak memiliki akses.'
            : parcelQuery.error instanceof Error
              ? parcelQuery.error.message
              : 'Terjadi kesalahan.'
        }
        action={
          <Link to="/parcels" className={buttonClass('primary')}>
            Kembali ke daftar bidang
          </Link>
        }
      />
    )
  }

  const parcel = parcelQuery.data
  const role = projectQuery.data?.member_role ?? ''
  const canWrite = role === 'admin' || role === 'manager' || role === 'surveyor'
  const canReview = role === 'admin' || role === 'manager' || role === 'supervisor'
  const canDelete = role === 'admin' || role === 'manager'
  const editable = canWrite && (parcel.verification_status === 'draft' || parcel.verification_status === 'rejected')
  const attributes = Object.entries(parcel.attributes ?? {})

  function transition(status: string, note = '') {
    setActionError(null)
    statusMutation.mutate(
      { status, note },
      {
        onError: (error) => {
          setActionError(
            error instanceof ApiError ? error.message : 'Status bidang tidak dapat diubah.',
          )
        },
      },
    )
  }

  function handleReject() {
    const note = window.prompt('Alasan penolakan bidang:')
    if (note === null) {
      return
    }
    if (note.trim() === '') {
      setActionError('Alasan penolakan wajib diisi.')
      return
    }
    transition('rejected', note.trim())
  }

  function handleDelete() {
    if (!window.confirm(`Hapus bidang "${parcel.parcel_code}"?`)) {
      return
    }
    deleteMutation.mutate(undefined, {
      onSuccess: () => navigate('/parcels'),
      onError: (error) => {
        setActionError(
          error instanceof ApiError ? error.message : 'Bidang tidak dapat dihapus.',
        )
      },
    })
  }

  const actionButtons = (
    <>
      <ParcelStatusBadge status={parcel.verification_status} />
      {parcel.verification_status === 'draft' && canWrite ? (
        <Button onClick={() => transition('submitted')} disabled={statusMutation.isPending}>
          Ajukan
        </Button>
      ) : null}
      {parcel.verification_status === 'submitted' && canReview ? (
        <Button onClick={() => transition('under_review')} disabled={statusMutation.isPending}>
          Mulai review
        </Button>
      ) : null}
      {parcel.verification_status === 'under_review' && canReview ? (
        <>
          <Button onClick={() => transition('approved')} disabled={statusMutation.isPending}>
            Setujui
          </Button>
          <Button
            variant="secondary"
            onClick={handleReject}
            disabled={statusMutation.isPending}
            className="text-rose-600"
          >
            Tolak
          </Button>
        </>
      ) : null}
      {parcel.verification_status === 'rejected' && canWrite ? (
        <Button onClick={() => transition('draft')} disabled={statusMutation.isPending}>
          Kembali ke draf
        </Button>
      ) : null}
      {editable ? (
        <Link to={`/parcels/${parcel.id}/edit`} className={buttonClass('secondary')}>
          Edit
        </Link>
      ) : null}
      {canDelete ? (
        <Button
          variant="secondary"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="text-rose-600"
        >
          {deleteMutation.isPending ? 'Menghapus…' : 'Hapus'}
        </Button>
      ) : null}
    </>
  )

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <nav className="text-xs text-slate-500">
        <Link to="/parcels" className="hover:text-slate-800">
          Bidang Tanah
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">{parcel.parcel_code}</span>
      </nav>

      <PageHeader
        title={parcel.parcel_code}
        description={`${parcel.land_use || 'Penggunaan lahan belum diisi'} · versi ${parcel.current_version}`}
        actions={actionButtons}
      />

      {actionError ? <Alert tone="danger">{actionError}</Alert> : null}
      {statusMutation.isError && !actionError ? (
        <Alert tone="danger">
          {statusMutation.error instanceof Error
            ? statusMutation.error.message
            : 'Status tidak dapat diubah.'}
        </Alert>
      ) : null}

      <Card>
        <dl className="grid gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Proyek</dt>
            <dd className="mt-1 text-sm text-slate-800">
              <Link to={`/projects/${parcel.project_id}`} className="hover:underline">
                {projectQuery.data?.name ?? parcel.project_id}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Survei</dt>
            <dd className="mt-1 text-sm text-slate-800">
              {parcel.survey_id ? (
                <Link to={`/surveys/${parcel.survey_id}`} className="hover:underline">
                  Lihat survei
                </Link>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Luas (backend)
            </dt>
            <dd className="mt-1 text-sm text-slate-800">
              {formatArea(parcel.area_m2)}
              <span className="ml-1 text-xs text-slate-400">({parcel.area_method})</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Diperbarui
            </dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDateTime(parcel.updated_at)}</dd>
          </div>
          {parcel.review_note ? (
            <div className="sm:col-span-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Catatan review
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{parcel.review_note}</dd>
            </div>
          ) : null}
          {parcel.notes ? (
            <div className="sm:col-span-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Catatan
              </dt>
              <dd className="mt-1 whitespace-pre-line text-sm text-slate-800">{parcel.notes}</dd>
            </div>
          ) : null}
        </dl>

        {attributes.length > 0 ? (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Atribut tambahan
            </h3>
            <dl className="mt-2 grid gap-2 sm:grid-cols-2">
              {attributes.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <dt className="text-slate-500">{key}</dt>
                  <dd className="text-right font-medium text-slate-800">
                    {typeof value === 'string' ? value : JSON.stringify(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </Card>

      <ParcelMapEditor
        parcel={parcel}
        areas={areasQuery.data ?? []}
        editable={editable}
      />

      <VersionHistory versions={versionsQuery.data ?? []} loading={versionsQuery.isPending} />
    </div>
  )
}
