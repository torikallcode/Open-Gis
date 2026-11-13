import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { useProjects } from '@/features/projects/hooks'
import { useSurveys } from '@/features/surveys/hooks'
import { SurveyMap } from '@/features/surveys/components/SurveyMap'
import type { AreaGeometry } from '@/features/surveys/types'
import { ApiError, fieldErrorMap } from '@/services/api'

import { AttributesEditor } from './components/AttributesEditor'
import { useCreateParcel, useParcel, useUpdateParcel } from './hooks'
import type { Parcel, ParcelInput, ParcelUpdateInput } from './types'

export function ParcelFormPage() {
  const { parcelId } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(parcelId)
  const parcelQuery = useParcel(parcelId)

  if (isEdit && parcelQuery.isPending) {
    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Memuat bidang…
      </div>
    )
  }

  if (isEdit && parcelQuery.isError) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Alert tone="danger" title="Bidang tidak dapat dimuat">
          {parcelQuery.error instanceof Error ? parcelQuery.error.message : 'Terjadi kesalahan.'}
        </Alert>
        <Link to="/parcels" className="text-sm font-medium text-slate-700 hover:underline">
          ← Kembali ke daftar bidang
        </Link>
      </div>
    )
  }

  return (
    <ParcelForm
      key={parcelQuery.data?.id ?? 'new'}
      parcel={parcelQuery.data}
      providedProjectId={searchParams.get('project_id') ?? ''}
    />
  )
}

interface ParcelFormProps {
  parcel?: Parcel
  providedProjectId: string
}

function ParcelForm({ parcel, providedProjectId }: ParcelFormProps) {
  const navigate = useNavigate()
  const projectsQuery = useProjects({ per_page: 100, sort: 'name', order: 'asc' })
  const createParcel = useCreateParcel()

  const [form, setForm] = useState({
    project_id: parcel?.project_id ?? providedProjectId,
    survey_id: parcel?.survey_id ?? '',
    parcel_code: parcel?.parcel_code ?? '',
    land_use: parcel?.land_use ?? '',
    notes: parcel?.notes ?? '',
  })
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    parcel?.attributes ?? {},
  )
  const [boundary, setBoundary] = useState<AreaGeometry | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const surveysQuery = useSurveys({
    project_id: form.project_id || undefined,
    per_page: 100,
    sort: 'created_at',
    order: 'desc',
  })
  const updateParcel = useUpdateParcel(parcel?.id ?? '', parcel?.project_id ?? '')

  const isEdit = Boolean(parcel)
  const isSaving = isEdit ? updateParcel.isPending : createParcel.isPending

  function updateField(key: keyof typeof form, value: string) {
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

    if (!form.project_id) {
      setErrors({ project_id: 'Pilih proyek.' })
      return
    }
    if (!form.parcel_code.trim()) {
      setErrors({ parcel_code: 'Kode bidang wajib diisi.' })
      return
    }
    if (!isEdit && !boundary) {
      setErrors({ boundary: 'Digitasi polygon bidang terlebih dahulu.' })
      return
    }

    const options = {
      onSuccess: (saved: Parcel) => navigate(`/parcels/${saved.id}`),
      onError: (error: unknown) => {
        setErrors(fieldErrorMap(error))
        setGeneralError(
          error instanceof ApiError ? error.message : 'Bidang tidak dapat disimpan.',
        )
      },
    }

    if (parcel) {
      const input: ParcelUpdateInput = {
        survey_id: form.survey_id,
        parcel_code: form.parcel_code.trim(),
        land_use: form.land_use,
        notes: form.notes,
        attributes,
      }
      updateParcel.mutate(input, options)
    } else {
      const input: ParcelInput = {
        project_id: form.project_id,
        survey_id: form.survey_id,
        parcel_code: form.parcel_code.trim(),
        land_use: form.land_use,
        notes: form.notes,
        attributes,
        boundary: boundary as AreaGeometry,
      }
      createParcel.mutate(input, options)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title={parcel ? 'Edit bidang' : 'Bidang baru'}
        description={
          parcel
            ? 'Perbarui atribut bidang. Geometri diubah dari halaman detail.'
            : 'Isi atribut, digitasi polygon, lalu simpan.'
        }
      />

      {generalError ? <Alert tone="danger">{generalError}</Alert> : null}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Proyek" htmlFor="project_id" required error={errors.project_id}>
              <Select
                id="project_id"
                value={form.project_id}
                onChange={(event) => {
                  updateField('project_id', event.target.value)
                  updateField('survey_id', '')
                }}
                invalid={Boolean(errors.project_id)}
                disabled={isEdit}
              >
                <option value="">Pilih proyek</option>
                {(projectsQuery.data?.items ?? []).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Survei (opsional)" htmlFor="survey_id" error={errors.survey_id}>
              <Select
                id="survey_id"
                value={form.survey_id}
                onChange={(event) => updateField('survey_id', event.target.value)}
                invalid={Boolean(errors.survey_id)}
                disabled={!form.project_id}
              >
                <option value="">Tidak terkait survei</option>
                {(surveysQuery.data?.items ?? []).map((survey) => (
                  <option key={survey.id} value={survey.id}>
                    {survey.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Kode bidang" htmlFor="parcel_code" required error={errors.parcel_code}>
              <Input
                id="parcel_code"
                value={form.parcel_code}
                onChange={(event) => updateField('parcel_code', event.target.value)}
                invalid={Boolean(errors.parcel_code)}
                maxLength={50}
                placeholder="Contoh: PAR-001"
              />
            </Field>

            <Field label="Penggunaan lahan" htmlFor="land_use" error={errors.land_use}>
              <Input
                id="land_use"
                value={form.land_use}
                onChange={(event) => updateField('land_use', event.target.value)}
                invalid={Boolean(errors.land_use)}
                maxLength={100}
                placeholder="Contoh: Permukiman, Sawah"
              />
            </Field>

            <Field label="Catatan" htmlFor="notes" error={errors.notes} className="sm:col-span-2">
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                invalid={Boolean(errors.notes)}
                rows={3}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Atribut tambahan</h2>
          <p className="mt-1 mb-3 text-xs text-slate-500">
            Disimpan sebagai objek JSON pada bidang (maksimal 32 KB).
          </p>
          <AttributesEditor initialValue={attributes} onChange={setAttributes} />
        </Card>

        {!isEdit ? (
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Geometri bidang</h2>
                <p className="text-xs text-slate-500">
                  Polygon wajib. Validasi dan luas dihitung backend.
                </p>
              </div>
              <Button
                type="button"
                variant={drawing ? 'primary' : 'secondary'}
                onClick={() => setDrawing((current) => !current)}
                className="px-3 py-1.5 text-xs"
              >
                {drawing ? 'Batalkan gambar' : 'Gambar polygon'}
              </Button>
            </div>

            {errors.boundary ? (
              <p className="mt-2 text-xs text-rose-600">{errors.boundary}</p>
            ) : null}

            <div className="mt-3 h-[320px] overflow-hidden rounded-lg border border-slate-200">
              <SurveyMap
                areas={[]}
                mode={drawing ? 'draw-area' : 'view'}
                onAreaDrawn={(geometry) => {
                  setBoundary(geometry)
                  setDrawing(false)
                  setErrors((current) => {
                    const next = { ...current }
                    delete next.boundary
                    return next
                  })
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {boundary
                ? 'Polygon siap disimpan.'
                : 'Klik "Gambar polygon", lalu klik dua kali untuk menyelesaikan.'}
            </p>
          </Card>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Link
            to={parcel ? `/parcels/${parcel.id}` : '/parcels'}
            className={buttonClass('secondary')}
          >
            Batal
          </Link>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Menyimpan…' : 'Simpan bidang'}
          </Button>
        </div>
      </form>
    </div>
  )
}
