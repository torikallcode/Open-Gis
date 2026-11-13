import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { formatCoordinate } from '@/features/map/format'
import { ApiError } from '@/services/api'

import { PointEditor } from './components/PointEditor'
import { SurveyMap } from './components/SurveyMap'
import { SurveyStatusBadge } from './components/SurveyStatusBadge'
import {
  useDeleteSurvey,
  useDeleteSurveyPoint,
  useSurvey,
  useSurveyAreas,
  useSurveyPoints,
} from './hooks'
import type { SurveyPoint } from './types'

function formatDateTime(value: string): string {
  if (!value) {
    return '—'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function SurveyDetailPage() {
  const { surveyId } = useParams()
  const navigate = useNavigate()
  const surveyQuery = useSurvey(surveyId)
  const pointsQuery = useSurveyPoints(surveyId)
  const areasQuery = useSurveyAreas(surveyQuery.data?.project_id)
  const deleteSurvey = useDeleteSurvey(surveyId ?? '')
  const deletePoint = useDeleteSurveyPoint(surveyId ?? '')

  const [editing, setEditing] = useState<'new' | SurveyPoint | null>(null)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<{ lon: number; lat: number } | null>(null)

  if (surveyQuery.isPending) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
        <Spinner /> Memuat survei…
      </div>
    )
  }

  if (surveyQuery.isError || !surveyQuery.data) {
    const notFound = surveyQuery.error instanceof ApiError && surveyQuery.error.status === 404

    return (
      <EmptyState
        title={notFound ? 'Survei tidak ditemukan' : 'Survei tidak dapat dimuat'}
        description={
          notFound
            ? 'Survei mungkin sudah dihapus atau Anda tidak memiliki akses.'
            : surveyQuery.error instanceof Error
              ? surveyQuery.error.message
              : 'Terjadi kesalahan.'
        }
        action={
          <Link to="/surveys" className={buttonClass('primary')}>
            Kembali ke daftar survei
          </Link>
        }
      />
    )
  }

  const survey = surveyQuery.data
  const points = pointsQuery.data ?? []
  const areas = areasQuery.data ?? []

  function openNewPoint() {
    setEditing('new')
    setPicked(null)
    setPicking(false)
  }

  function openEditPoint(point: SurveyPoint) {
    setEditing(point)
    setPicked(null)
    setPicking(false)
  }

  function closeEditor() {
    setEditing(null)
    setPicking(false)
    setPicked(null)
  }

  function handleDeleteSurvey() {
    if (!window.confirm(`Hapus survei "${survey.name}"? Data survei akan ditandai terhapus.`)) {
      return
    }
    deleteSurvey.mutate(undefined, {
      onSuccess: () => navigate('/surveys'),
    })
  }

  function handleDeletePoint(point: SurveyPoint) {
    if (!window.confirm(`Hapus titik ${point.point_code}?`)) {
      return
    }
    deletePoint.mutate(point.id, {
      onError: (error) => {
        window.alert(
          error instanceof ApiError ? error.message : 'Titik tidak dapat dihapus.',
        )
      },
    })
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <nav className="text-xs text-slate-500">
        <Link to="/surveys" className="hover:text-slate-800">
          Survei
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">{survey.name}</span>
      </nav>

      <PageHeader
        title={survey.name}
        description={`${survey.project_name}${survey.survey_date ? ` · ${survey.survey_date}` : ''}`}
        actions={
          <>
            <SurveyStatusBadge status={survey.status} />
            <Link to={`/surveys/${survey.id}/edit`} className={buttonClass('secondary')}>
              Edit
            </Link>
            <Button
              variant="secondary"
              onClick={handleDeleteSurvey}
              disabled={deleteSurvey.isPending}
              className="text-rose-600"
            >
              {deleteSurvey.isPending ? 'Menghapus…' : 'Hapus'}
            </Button>
          </>
        }
      />

      {deleteSurvey.isError ? (
        <Alert tone="danger">
          {deleteSurvey.error instanceof ApiError
            ? deleteSurvey.error.message
            : 'Survei tidak dapat dihapus.'}
        </Alert>
      ) : null}

      <Card>
        <dl className="grid gap-4 sm:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Proyek</dt>
            <dd className="mt-1 text-sm text-slate-800">
              <Link to={`/projects/${survey.project_id}`} className="hover:underline">
                {survey.project_name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Metode</dt>
            <dd className="mt-1 text-sm text-slate-800">{survey.method || '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Jumlah titik
            </dt>
            <dd className="mt-1 text-sm text-slate-800">{points.length}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Terakhir diperbarui
            </dt>
            <dd className="mt-1 text-sm text-slate-800">{formatDateTime(survey.updated_at)}</dd>
          </div>
          {survey.notes ? (
            <div className="sm:col-span-4">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Catatan
              </dt>
              <dd className="mt-1 whitespace-pre-line text-sm text-slate-800">{survey.notes}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Peta survei</h2>
            <p className="text-xs text-slate-500">
              Area kerja proyek dan titik survei. {picking ? 'Klik peta untuk mengisi koordinat.' : ''}
            </p>
          </div>
          <span className="text-xs text-slate-400">{areas.length} area · {points.length} titik</span>
        </div>
        <div className="h-[420px]">
          <SurveyMap
            areas={areas}
            points={points}
            mode={picking ? 'pick-point' : 'view'}
            onPointPicked={(lon, lat) => {
              setPicked({ lon, lat })
              setPicking(false)
            }}
          />
        </div>
      </div>

      {editing ? (
        <PointEditor
          key={editing === 'new' ? 'new' : editing.id}
          surveyId={survey.id}
          point={editing === 'new' ? null : editing}
          pickedCoordinate={picked}
          picking={picking}
          onTogglePicking={() => setPicking((current) => !current)}
          onClose={closeEditor}
        />
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Titik koordinat</h2>
          {!editing ? (
            <Button onClick={openNewPoint} className="px-3 py-1.5 text-xs">
              Tambah titik
            </Button>
          ) : null}
        </div>

        {pointsQuery.isPending ? (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
            <Spinner /> Memuat titik…
          </div>
        ) : points.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Belum ada titik. Tambahkan titik secara manual atau dengan klik peta.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Longitude</th>
                  <th className="px-4 py-3 font-medium">Latitude</th>
                  <th className="px-4 py-3 font-medium">Akurasi</th>
                  <th className="px-4 py-3 font-medium">Elevasi</th>
                  <th className="px-4 py-3 font-medium">Sumber</th>
                  <th className="px-4 py-3 font-medium">Waktu</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {points.map((point) => (
                  <tr key={point.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{point.point_code}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {formatCoordinate(point.location.coordinates[0], 7)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {formatCoordinate(point.location.coordinates[1], 7)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {point.accuracy_m === null ? '—' : `${point.accuracy_m} m`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {point.elevation_m === null ? '—' : `${point.elevation_m} m`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{point.source || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDateTime(point.recorded_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="secondary"
                          onClick={() => openEditPoint(point)}
                          className="px-3 py-1.5 text-xs"
                        >
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => handleDeletePoint(point)}
                          disabled={deletePoint.isPending}
                          className="px-3 py-1.5 text-xs text-rose-600"
                        >
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
