import { useState, type FormEvent } from 'react'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Spinner } from '@/components/ui/Spinner'
import { ApiError, fieldErrorMap } from '@/services/api'

import {
  useAddProjectMember,
  useProjectMembers,
  useRemoveProjectMember,
  useUpdateProjectMemberRole,
} from '../hooks'
import {
  PROJECT_ROLE_LABELS,
  PROJECT_ROLE_OPTIONS,
  type ProjectRole,
} from '../types'

interface MembersPanelProps {
  projectId: string
}

export function MembersPanel({ projectId }: MembersPanelProps) {
  const membersQuery = useProjectMembers(projectId)
  const addMember = useAddProjectMember(projectId)
  const updateRole = useUpdateProjectMemberRole(projectId)
  const removeMember = useRemoveProjectMember(projectId)

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ProjectRole>('surveyor')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState<string | null>(null)

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors({})
    setGeneralError(null)

    if (!email.trim()) {
      setErrors({ email: 'Email wajib diisi.' })
      return
    }

    addMember.mutate(
      { email: email.trim(), project_role: role },
      {
        onSuccess: () => {
          setEmail('')
          setRole('surveyor')
        },
        onError: (error) => {
          setErrors(fieldErrorMap(error))
          if (!(error instanceof ApiError) || error.details.length === 0) {
            setGeneralError(
              error instanceof ApiError ? error.message : 'Anggota tidak dapat ditambahkan.',
            )
          }
        },
      },
    )
  }

  function handleRoleChange(userId: string, projectRole: ProjectRole) {
    setGeneralError(null)
    updateRole.mutate(
      { userId, projectRole },
      {
        onError: (error) => {
          setGeneralError(
            error instanceof ApiError ? error.message : 'Peran anggota tidak dapat diubah.',
          )
        },
      },
    )
  }

  function handleRemove(userId: string, name: string) {
    if (!window.confirm(`Hapus ${name} dari proyek ini?`)) {
      return
    }

    setGeneralError(null)
    removeMember.mutate(userId, {
      onError: (error) => {
        setGeneralError(
          error instanceof ApiError ? error.message : 'Anggota tidak dapat dihapus.',
        )
      },
    })
  }

  const members = membersQuery.data ?? []

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-900">Tambah anggota</h2>
        <p className="mt-1 text-xs text-slate-500">
          Tambahkan pengguna yang sudah terdaftar berdasarkan email. Peran proyek menentukan
          akses mereka.
        </p>

        {generalError ? (
          <Alert tone="danger" className="mt-3">
            {generalError}
          </Alert>
        ) : null}

        <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-start gap-3" noValidate>
          <Field label="Email pengguna" htmlFor="member_email" error={errors.email} className="min-w-64 flex-1">
            <Input
              id="member_email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="surveyor@example.local"
              invalid={Boolean(errors.email)}
            />
          </Field>

          <Field label="Peran" htmlFor="member_role" error={errors.project_role} className="w-52">
            <Select
              id="member_role"
              value={role}
              onChange={(event) => setRole(event.target.value as ProjectRole)}
              invalid={Boolean(errors.project_role)}
            >
              {PROJECT_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>

          <Button type="submit" disabled={addMember.isPending} className="mt-6">
            {addMember.isPending ? 'Menambahkan…' : 'Tambah'}
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {membersQuery.isPending ? (
          <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-slate-500">
            <Spinner /> Memuat anggota…
          </div>
        ) : members.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Belum ada anggota pada proyek ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Peran</th>
                  <th className="px-4 py-3 font-medium">Bergabung</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.user_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{member.name}</td>
                    <td className="px-4 py-3 text-slate-600">{member.email}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={member.project_role}
                        onChange={(event) =>
                          handleRoleChange(member.user_id, event.target.value as ProjectRole)
                        }
                        aria-label={`Peran ${member.name}`}
                        className="max-w-44"
                        disabled={updateRole.isPending}
                      >
                        {PROJECT_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {PROJECT_ROLE_LABELS[option.value]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
                        new Date(member.joined_at),
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        onClick={() => handleRemove(member.user_id, member.name)}
                        disabled={removeMember.isPending}
                        className="px-3 py-1.5 text-xs"
                      >
                        Hapus
                      </Button>
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
