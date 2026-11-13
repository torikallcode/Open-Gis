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
import { ApiError, fieldErrorMap } from '@/services/api'

import { useCreateSurvey, useSurvey, useUpdateSurvey } from './hooks'
import {
  SURVEY_STATUS_OPTIONS,
  type Survey,
  type SurveyInput,
  type SurveyStatus,
} from './types'

function toInput(survey: Survey): SurveyInput {
  return {
    project_id: survey.project_id,
    surveyor_id: survey.surveyor_id,
    name: survey.name,
    survey_date: survey.survey_date,
    method: survey.method,
    status: survey.status,
    notes: survey.notes,
  }
}

function emptyInput(projectId: string): SurveyInput {
  return {
    project_id: projectId,
    name: '',
    survey_date: '',
    method: '',
    status: 'draft',
    notes: '',
  }
}

export function SurveyFormPage() {
  const { surveyId } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(surveyId)
  const surveyQuery = useSurvey(surveyId)

  if (isEdit && surveyQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Memuat survei…
      </div>
    )
  }

  if (isEdit && surveyQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Alert tone="danger" title="Survei tidak dapat dimuat">
          {surveyQuery.error instanceof Error ? surveyQuery.error.message : 'Terjadi kesalahan.'}
        </Alert>
        <Link to="/surveys" className="text-sm font-medium text-slate-700 hover:underline">
          ← Kembali ke daftar survei
        </Link>
      </div>
    )
  }

  return (
    <SurveyForm
      key={surveyQuery.data?.id ?? 'new'}
      survey={surveyQuery.data}
      providedProjectId={searchParams.get('project_id') ?? ''}
    />
  )
}

interface SurveyFormProps {
  survey?: Survey
  providedProjectId: string
}

function SurveyForm({ survey, providedProjectId }: SurveyFormProps) {
  const navigate = useNavigate()
  const projectsQuery = useProjects({ per_page: 100, sort: 'name', order: 'asc' })
  const createSurvey = useCreateSurvey()
  const updateSurvey = useUpdateSurvey(survey?.id ?? '')

  const [form, setForm] = useState<SurveyInput>(() =>
    survey ? toInput(survey) : emptyInput(providedProjectId || projectsQuery.data?.items[0]?.id || ''),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const mutation = survey ? updateSurvey : createSurvey
  const isSaving = mutation.isPending

  function updateField<K extends keyof SurveyInput>(key: K, value: SurveyInput[K]) {
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
    if (!form.name.trim()) {
      setErrors({ name: 'Nama survei wajib diisi.' })
      return
    }

    mutation.mutate(form, {
      onSuccess: (saved) => navigate(`/surveys/${saved.id}`),
      onError: (error) => {
        setErrors(fieldErrorMap(error))
        setGeneralError(
          error instanceof ApiError ? error.message : 'Survei tidak dapat disimpan.',
        )
      },
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title={survey ? 'Edit survei' : 'Survei baru'}
        description={
          survey
            ? 'Perbarui informasi kegiatan survei.'
            : 'Buat kegiatan survei di dalam proyek yang sudah ada.'
        }
      />

      {generalError ? <Alert tone="danger">{generalError}</Alert> : null}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Card>
          <div className="grid gap-4">
            <Field label="Proyek" htmlFor="project_id" required error={errors.project_id}>
              <Select
                id="project_id"
                value={form.project_id}
                onChange={(event) => updateField('project_id', event.target.value)}
                invalid={Boolean(errors.project_id)}
                disabled={Boolean(survey)}
              >
                <option value="">Pilih proyek</option>
                {(projectsQuery.data?.items ?? []).map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Nama survei" htmlFor="name" required error={errors.name}>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                invalid={Boolean(errors.name)}
                maxLength={200}
                placeholder="Contoh: Survei Bidang Blok A"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Tanggal survei" htmlFor="survey_date" error={errors.survey_date}>
                <Input
                  id="survey_date"
                  type="date"
                  value={form.survey_date}
                  onChange={(event) => updateField('survey_date', event.target.value)}
                  invalid={Boolean(errors.survey_date)}
                />
              </Field>

              <Field label="Status" htmlFor="status" error={errors.status}>
                <Select
                  id="status"
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value as SurveyStatus)}
                  invalid={Boolean(errors.status)}
                >
                  {SURVEY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Metode" htmlFor="method" error={errors.method}>
              <Input
                id="method"
                value={form.method}
                onChange={(event) => updateField('method', event.target.value)}
                invalid={Boolean(errors.method)}
                maxLength={100}
                placeholder="Contoh: Total Station, GNSS RTK"
              />
            </Field>

            <Field label="Catatan" htmlFor="notes" error={errors.notes}>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => updateField('notes', event.target.value)}
                invalid={Boolean(errors.notes)}
                rows={3}
                placeholder="Kondisi lapangan, kendala, atau instruksi khusus"
              />
            </Field>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Link
            to={survey ? `/surveys/${survey.id}` : '/surveys'}
            className={buttonClass('secondary')}
          >
            Batal
          </Link>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Menyimpan…' : 'Simpan survei'}
          </Button>
        </div>
      </form>
    </div>
  )
}
