import { useEffect, useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { ApiError, fieldErrorMap } from '@/services/api'

import { useCreateSurveyPoint, useUpdateSurveyPoint } from '../hooks'
import type { SurveyPoint, SurveyPointInput } from '../types'

interface PointEditorProps {
  surveyId: string
  point?: SurveyPoint | null
  pickedCoordinate: { lon: number; lat: number } | null
  picking: boolean
  onTogglePicking: () => void
  onClose: () => void
}

interface FormState {
  point_code: string
  longitude: string
  latitude: string
  accuracy: string
  elevation: string
  source: string
  recorded_at: string
}

function toFormState(point?: SurveyPoint | null): FormState {
  if (!point) {
    return {
      point_code: '',
      longitude: '',
      latitude: '',
      accuracy: '',
      elevation: '',
      source: '',
      recorded_at: '',
    }
  }

  return {
    point_code: point.point_code,
    longitude: String(point.location.coordinates[0]),
    latitude: String(point.location.coordinates[1]),
    accuracy: point.accuracy_m === null ? '' : String(point.accuracy_m),
    elevation: point.elevation_m === null ? '' : String(point.elevation_m),
    source: point.source,
    recorded_at: point.recorded_at ? point.recorded_at.slice(0, 16) : '',
  }
}

export function PointEditor({
  surveyId,
  point,
  pickedCoordinate,
  picking,
  onTogglePicking,
  onClose,
}: PointEditorProps) {
  const createPoint = useCreateSurveyPoint(surveyId)
  const updatePoint = useUpdateSurveyPoint(surveyId)
  const [form, setForm] = useState<FormState>(() => toFormState(point))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  useEffect(() => {
    if (!pickedCoordinate) {
      return
    }
    setForm((current) => ({
      ...current,
      longitude: pickedCoordinate.lon.toFixed(7),
      latitude: pickedCoordinate.lat.toFixed(7),
    }))
    setErrors((current) => {
      const next = { ...current }
      delete next.longitude
      delete next.latitude
      delete next.location
      return next
    })
  }, [pickedCoordinate])

  const mutation = point ? updatePoint : createPoint
  const isSaving = mutation.isPending

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) {
        return current
      }
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setGeneralError(null)

    const longitude = Number(form.longitude)
    const latitude = Number(form.latitude)
    const nextErrors: Record<string, string> = {}

    if (!form.point_code.trim()) {
      nextErrors.point_code = 'Kode titik wajib diisi.'
    }
    if (form.longitude.trim() === '' || Number.isNaN(longitude) || longitude < -180 || longitude > 180) {
      nextErrors.longitude = 'Longitude harus antara -180 dan 180.'
    }
    if (form.latitude.trim() === '' || Number.isNaN(latitude) || latitude < -90 || latitude > 90) {
      nextErrors.latitude = 'Latitude harus antara -90 dan 90.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    const input: SurveyPointInput = {
      point_code: form.point_code.trim(),
      location: { type: 'Point', coordinates: [longitude, latitude] },
      accuracy_m: form.accuracy.trim() === '' ? null : Number(form.accuracy),
      elevation_m: form.elevation.trim() === '' ? null : Number(form.elevation),
      source: form.source.trim(),
      recorded_at: form.recorded_at,
    }

    const options = {
      onSuccess: () => onClose(),
      onError: (error: unknown) => {
        setErrors(fieldErrorMap(error))
        setGeneralError(
          error instanceof ApiError ? error.message : 'Titik survei tidak dapat disimpan.',
        )
      },
    }

    if (point) {
      updatePoint.mutate({ pointId: point.id, input }, options)
    } else {
      createPoint.mutate(input, options)
    }
  }

  const locationError = errors.location ?? errors.longitude ?? errors.latitude ?? errors.coordinates

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            {point ? `Edit titik ${point.point_code}` : 'Tambah titik survei'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Isi koordinat manual, atau aktifkan "Ambil dari peta" lalu klik lokasi pada peta.
          </p>
        </div>
        <Button
          type="button"
          variant={picking ? 'primary' : 'secondary'}
          onClick={onTogglePicking}
          className="px-3 py-1.5 text-xs"
        >
          {picking ? 'Klik peta…' : 'Ambil dari peta'}
        </Button>
      </div>

      {generalError ? (
        <Alert tone="danger" className="mt-3">
          {generalError}
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kode titik" htmlFor="point_code" required error={errors.point_code}>
            <Input
              id="point_code"
              value={form.point_code}
              onChange={(event) => updateField('point_code', event.target.value)}
              invalid={Boolean(errors.point_code)}
              maxLength={50}
              placeholder="Contoh: PT-001"
            />
          </Field>

          <Field label="Sumber" htmlFor="point_source" error={errors.source}>
            <Input
              id="point_source"
              value={form.source}
              onChange={(event) => updateField('source', event.target.value)}
              invalid={Boolean(errors.source)}
              maxLength={100}
              placeholder="Contoh: Total Station"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Longitude" htmlFor="longitude" required error={errors.longitude}>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={(event) => updateField('longitude', event.target.value)}
              invalid={Boolean(errors.longitude)}
              placeholder="110.3603"
            />
          </Field>

          <Field label="Latitude" htmlFor="latitude" required error={errors.latitude}>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={(event) => updateField('latitude', event.target.value)}
              invalid={Boolean(errors.latitude)}
              placeholder="-7.8003"
            />
          </Field>
        </div>

        {locationError ? <p className="text-xs text-rose-600">{locationError}</p> : null}

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Akurasi (m)" htmlFor="accuracy" error={errors.accuracy_m}>
            <Input
              id="accuracy"
              type="number"
              step="any"
              min={0}
              value={form.accuracy}
              onChange={(event) => updateField('accuracy', event.target.value)}
              invalid={Boolean(errors.accuracy_m)}
              placeholder="0.03"
            />
          </Field>

          <Field label="Elevasi (m)" htmlFor="elevation" error={errors.elevation_m}>
            <Input
              id="elevation"
              type="number"
              step="any"
              value={form.elevation}
              onChange={(event) => updateField('elevation', event.target.value)}
              invalid={Boolean(errors.elevation_m)}
              placeholder="120.5"
            />
          </Field>

          <Field label="Waktu pencatatan" htmlFor="recorded_at" error={errors.recorded_at}>
            <Input
              id="recorded_at"
              type="datetime-local"
              value={form.recorded_at}
              onChange={(event) => updateField('recorded_at', event.target.value)}
              invalid={Boolean(errors.recorded_at)}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Menyimpan…' : 'Simpan titik'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
