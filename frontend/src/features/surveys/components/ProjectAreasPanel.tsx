import { useState } from 'react'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { formatArea } from '@/features/map/format'
import { ApiError, fieldErrorMap } from '@/services/api'

import {
  useCreateSurveyArea,
  useDeleteSurveyArea,
  useSurveyAreas,
} from '../hooks'
import type { AreaGeometry, SurveyArea } from '../types'
import { SurveyMap } from './SurveyMap'

interface ProjectAreasPanelProps {
  projectId: string
}

export function ProjectAreasPanel({ projectId }: ProjectAreasPanelProps) {
  const areasQuery = useSurveyAreas(projectId)
  const createArea = useCreateSurveyArea(projectId)
  const deleteArea = useDeleteSurveyArea(projectId)

  const [drawing, setDrawing] = useState(false)
  const [boundary, setBoundary] = useState<AreaGeometry | null>(null)
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const areas = areasQuery.data ?? []

  const previewArea: SurveyArea | null = boundary
    ? {
        id: 'preview',
        project_id: projectId,
        name: name || 'Area baru',
        boundary,
        area_m2: 0,
        area_method: '',
        created_by: '',
        updated_by: '',
        created_at: '',
        updated_at: '',
      }
    : null

  const mapAreas = previewArea ? [...areas, previewArea] : areas

  function startDrawing() {
    setBoundary(null)
    setName('')
    setErrors({})
    setGeneralError(null)
    setDrawing(true)
  }

  function cancelDrawing() {
    setDrawing(false)
    setBoundary(null)
    setName('')
    setErrors({})
  }

  function handleAreaDrawn(geometry: AreaGeometry) {
    setBoundary(geometry)
    setDrawing(false)
    setName(
      name ||
        `Area ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date())}`,
    )
  }

  function handleSave() {
    if (!boundary) {
      return
    }

    setErrors({})
    setGeneralError(null)

    if (!name.trim()) {
      setErrors({ name: 'Nama area wajib diisi.' })
      return
    }

    createArea.mutate(
      { name: name.trim(), boundary },
      {
        onSuccess: () => {
          setBoundary(null)
          setName('')
        },
        onError: (error) => {
          setErrors(fieldErrorMap(error))
          setGeneralError(
            error instanceof ApiError ? error.message : 'Area kerja tidak dapat disimpan.',
          )
        },
      },
    )
  }

  function handleDelete(area: SurveyArea) {
    if (!window.confirm(`Hapus area "${area.name}"?`)) {
      return
    }

    setGeneralError(null)
    deleteArea.mutate(area.id, {
      onError: (error) => {
        setGeneralError(
          error instanceof ApiError ? error.message : 'Area kerja tidak dapat dihapus.',
        )
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Area kerja proyek</h2>
            <p className="text-xs text-slate-500">
              Digambar di peta, disimpan EPSG:4326, luas dihitung backend pada CRS proyek.
            </p>
          </div>
          {!drawing && !boundary ? (
            <Button onClick={startDrawing} className="px-3 py-1.5 text-xs">
              Gambar area
            </Button>
          ) : null}
        </div>

        <div className="relative h-[380px]">
          <SurveyMap
            areas={mapAreas}
            mode={drawing ? 'draw-area' : 'view'}
            onAreaDrawn={handleAreaDrawn}
          />

          {drawing ? (
            <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg bg-slate-900/85 px-3 py-1.5 text-xs text-white shadow">
              Klik untuk menggambar polygon, klik dua kali untuk selesai.
            </div>
          ) : null}

          {areasQuery.isPending ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-slate-500">
              Memuat area…
            </div>
          ) : null}
        </div>
      </div>

      {generalError ? <Alert tone="danger">{generalError}</Alert> : null}

      {boundary ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-medium text-sky-900">Polygon area siap disimpan</p>
          <p className="mt-1 text-xs text-sky-700">
            Luas final akan dihitung backend setelah disimpan.
          </p>
          <div className="mt-3 flex flex-wrap items-start gap-3">
            <Field label="Nama area" htmlFor="area_name" error={errors.name} className="min-w-64 flex-1">
              <Input
                id="area_name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                invalid={Boolean(errors.name)}
                maxLength={150}
              />
            </Field>
            <Button onClick={handleSave} disabled={createArea.isPending} className="mt-6">
              {createArea.isPending ? 'Menyimpan…' : 'Simpan area'}
            </Button>
            <Button
              variant="secondary"
              onClick={cancelDrawing}
              disabled={createArea.isPending}
              className="mt-6"
            >
              Batal
            </Button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {areas.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Belum ada area kerja. Gambar area agar survei memiliki cakupan yang jelas.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nama</th>
                <th className="px-4 py-3 font-medium">Luas</th>
                <th className="px-4 py-3 font-medium">Dibuat</th>
                <th className="px-4 py-3 font-medium text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {areas.map((area) => (
                <tr key={area.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{area.name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatArea(area.area_m2)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
                      new Date(area.created_at),
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="secondary"
                      onClick={() => handleDelete(area)}
                      disabled={deleteArea.isPending}
                      className="px-3 py-1.5 text-xs text-rose-600"
                    >
                      Hapus
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
