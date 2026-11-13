import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ApiError, fieldErrorMap } from '@/services/api'

import { CRS_PRESETS, DEFAULT_CRS_EPSG, isCRSPreset } from './crs'
import { useCreateProject, useProject, useUpdateProject } from './hooks'
import { PROJECT_STATUS_OPTIONS, type Project, type ProjectInput, type ProjectStatus } from './types'

function toInput(project: Project): ProjectInput {
  return {
    name: project.name,
    description: project.description,
    location: project.location,
    crs_epsg: project.crs_epsg,
    status: project.status,
    start_date: project.start_date,
    end_date: project.end_date,
  }
}

const emptyInput: ProjectInput = {
  name: '',
  description: '',
  location: '',
  crs_epsg: DEFAULT_CRS_EPSG,
  status: 'planning',
  start_date: '',
  end_date: '',
}

export function ProjectFormPage() {
  const { projectId } = useParams()
  const isEdit = Boolean(projectId)
  const projectQuery = useProject(projectId)

  if (isEdit && projectQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        Memuat proyek…
      </div>
    )
  }

  if (isEdit && projectQuery.isError) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Alert tone="danger" title="Proyek tidak dapat dimuat">
          {projectQuery.error instanceof Error ? projectQuery.error.message : 'Terjadi kesalahan.'}
        </Alert>
        <Link to="/projects" className="text-sm font-medium text-slate-700 hover:underline">
          ← Kembali ke daftar proyek
        </Link>
      </div>
    )
  }

  return (
    <ProjectForm
      key={projectQuery.data?.id ?? 'new'}
      project={projectQuery.data}
      projectId={projectId}
    />
  )
}

interface ProjectFormProps {
  project?: Project
  projectId?: string
}

function ProjectForm({ project, projectId }: ProjectFormProps) {
  const navigate = useNavigate()
  const createProject = useCreateProject()
  const updateProject = useUpdateProject(projectId ?? '')

  const [form, setForm] = useState<ProjectInput>(() => (project ? toInput(project) : emptyInput))
  const [crsValue, setCRSValue] = useState(project?.crs_epsg ?? DEFAULT_CRS_EPSG)
  const [crsMode, setCRSMode] = useState<'preset' | 'manual'>(() =>
    project && !isCRSPreset(project.crs_epsg) ? 'manual' : 'preset',
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  const mutation = project ? updateProject : createProject
  const isSaving = mutation.isPending

  function updateField<K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) {
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

    const payload: ProjectInput = { ...form, crs_epsg: crsValue }

    if (!payload.name.trim()) {
      setErrors({ name: 'Nama proyek wajib diisi.' })
      return
    }
    if (payload.crs_epsg <= 0) {
      setErrors({ crs_epsg: 'Pilih CRS proyek.' })
      return
    }

    const options = {
      onSuccess: (saved: Project) => {
        navigate(`/projects/${saved.id}`)
      },
      onError: (error: unknown) => {
        setErrors(fieldErrorMap(error))
        setGeneralError(
          error instanceof ApiError ? error.message : 'Proyek tidak dapat disimpan.',
        )
      },
    }

    mutation.mutate(payload, options)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title={project ? 'Edit proyek' : 'Proyek baru'}
        description={
          project
            ? 'Perbarui informasi proyek, CRS, dan jadwal.'
            : 'Tentukan informasi dasar proyek sebelum menambahkan survei.'
        }
      />

      {generalError ? <Alert tone="danger">{generalError}</Alert> : null}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Informasi proyek</h2>
          <div className="mt-4 grid gap-4">
            <Field label="Nama proyek" htmlFor="name" required error={errors.name}>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                invalid={Boolean(errors.name)}
                maxLength={200}
                placeholder="Contoh: Survei Bidang Sleman 2026"
              />
            </Field>

            <Field label="Deskripsi" htmlFor="description" error={errors.description}>
              <Textarea
                id="description"
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                invalid={Boolean(errors.description)}
                rows={3}
                placeholder="Tujuan dan cakupan proyek"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Lokasi" htmlFor="location" error={errors.location}>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(event) => updateField('location', event.target.value)}
                  invalid={Boolean(errors.location)}
                  maxLength={255}
                  placeholder="Kabupaten/kota, provinsi"
                />
              </Field>

              <Field label="Status" htmlFor="status" error={errors.status}>
                <Select
                  id="status"
                  value={form.status}
                  onChange={(event) => updateField('status', event.target.value as ProjectStatus)}
                  invalid={Boolean(errors.status)}
                >
                  {PROJECT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Sistem koordinat</h2>
          <p className="mt-1 text-xs text-slate-500">
            CRS proyeksi metrik dipakai backend untuk menghitung luas dan panjang. Data GeoJSON
            tetap dikirim dalam EPSG:4326.
          </p>

          <div className="mt-4 grid gap-4">
            <Field
              label="CRS proyek"
              htmlFor="crs"
              required
              error={errors.crs_epsg}
              hint="Pilih zona UTM yang sesuai lokasi, atau masukkan EPSG proyeksi lain."
            >
              <Select
                id="crs"
                value={crsMode === 'manual' ? 'manual' : String(crsValue)}
                onChange={(event) => {
                  if (event.target.value === 'manual') {
                    setCRSMode('manual')
                    return
                  }
                  setCRSMode('preset')
                  setCRSValue(Number(event.target.value))
                }}
                invalid={Boolean(errors.crs_epsg)}
              >
                <optgroup label="Belahan selatan">
                  {CRS_PRESETS.filter((preset) => preset.hemisphere === 'S').map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Belahan utara">
                  {CRS_PRESETS.filter((preset) => preset.hemisphere === 'N').map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </optgroup>
                <option value="manual">Lainnya (input EPSG manual)</option>
              </Select>
            </Field>

            {crsMode === 'manual' ? (
              <Field label="EPSG manual" htmlFor="crs_manual" hint="Harus CRS proyeksi metrik.">
                <Input
                  id="crs_manual"
                  type="number"
                  min={1}
                  value={crsValue || ''}
                  onChange={(event) => setCRSValue(Number(event.target.value))}
                  invalid={Boolean(errors.crs_epsg)}
                  placeholder="Contoh: 32749"
                />
              </Field>
            ) : null}
          </div>
        </Card>

        <Card>
          <h2 className="text-sm font-semibold text-slate-900">Jadwal</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal mulai" htmlFor="start_date" error={errors.start_date}>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(event) => updateField('start_date', event.target.value)}
                invalid={Boolean(errors.start_date)}
              />
            </Field>

            <Field label="Tanggal selesai" htmlFor="end_date" error={errors.end_date}>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(event) => updateField('end_date', event.target.value)}
                invalid={Boolean(errors.end_date)}
              />
            </Field>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Link
            to={project ? `/projects/${project.id}` : '/projects'}
            className={buttonClass('secondary')}
          >
            Batal
          </Link>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Menyimpan…' : 'Simpan proyek'}
          </Button>
        </div>
      </form>
    </div>
  )
}
