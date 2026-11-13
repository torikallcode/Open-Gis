import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonClass } from '@/components/ui/buttonStyles'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { ApiError } from '@/services/api'

import { MembersPanel } from './components/MembersPanel'
import { ProjectStatusBadge } from './components/ProjectStatusBadge'
import { crsLabel } from './crs'
import { useDeleteProject, useProject } from './hooks'

type Tab = 'ringkasan' | 'anggota'

export function ProjectDetailPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const projectQuery = useProject(projectId)
  const deleteProject = useDeleteProject(projectId ?? '')
  const [tab, setTab] = useState<Tab>('ringkasan')

  if (projectQuery.isPending) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-10 text-sm text-slate-500">
        <Spinner /> Memuat proyek…
      </div>
    )
  }

  if (projectQuery.isError || !projectQuery.data) {
    const notFound = projectQuery.error instanceof ApiError && projectQuery.error.status === 404

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <EmptyState
          title={notFound ? 'Proyek tidak ditemukan' : 'Proyek tidak dapat dimuat'}
          description={
            notFound
              ? 'Proyek mungkin sudah dihapus atau Anda tidak memiliki akses.'
              : projectQuery.error instanceof Error
                ? projectQuery.error.message
                : 'Terjadi kesalahan.'
          }
          action={
            <Link
              to="/projects"
              className="inline-flex items-center rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Kembali ke daftar proyek
            </Link>
          }
        />
      </div>
    )
  }

  const project = projectQuery.data

  function handleDelete() {
    if (!window.confirm(`Hapus proyek "${project.name}"? Tindakan ini akan menandai proyek sebagai terhapus.`)) {
      return
    }

    deleteProject.mutate(undefined, {
      onSuccess: () => navigate('/projects'),
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <nav className="text-xs text-slate-500">
        <Link to="/projects" className="hover:text-slate-800">
          Proyek
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-700">{project.name}</span>
      </nav>

      <PageHeader
        title={project.name}
        description={project.location || 'Lokasi belum diisi'}
        actions={
          <>
            <ProjectStatusBadge status={project.status} />
            <Link to={`/projects/${project.id}/edit`} className={buttonClass('secondary')}>
              Edit
            </Link>
            <Button
              variant="secondary"
              onClick={handleDelete}
              disabled={deleteProject.isPending}
              className="text-rose-600"
            >
              {deleteProject.isPending ? 'Menghapus…' : 'Hapus'}
            </Button>
          </>
        }
      />

      {deleteProject.isError ? (
        <Alert tone="danger">
          {deleteProject.error instanceof ApiError
            ? deleteProject.error.message
            : 'Proyek tidak dapat dihapus.'}
        </Alert>
      ) : null}

      <div className="flex gap-1 border-b border-slate-200">
        {(
          [
            { id: 'ringkasan', label: 'Ringkasan' },
            { id: 'anggota', label: 'Anggota' },
          ] as { id: Tab; label: string }[]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === item.id
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'ringkasan' ? (
        <Card>
          <dl className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Deskripsi
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {project.description || 'Belum ada deskripsi.'}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">CRS</dt>
              <dd className="mt-1 text-sm text-slate-800">{crsLabel(project.crs_epsg)}</dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Periode
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {project.start_date || '—'}
                {project.end_date ? ` → ${project.end_date}` : ''}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Dibuat
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {new Intl.DateTimeFormat('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(project.created_at))}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Diperbarui
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {new Intl.DateTimeFormat('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(project.updated_at))}
              </dd>
            </div>
          </dl>
        </Card>
      ) : (
        <MembersPanel projectId={project.id} />
      )}
    </div>
  )
}
