import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  addProjectMember,
  createProject,
  deleteProject,
  getProject,
  listProjectMembers,
  listProjects,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole,
} from './services'
import type { ProjectInput, ProjectQuery, ProjectRole } from './types'

const projectKeys = {
  all: ['projects'] as const,
  list: (query: ProjectQuery) => ['projects', 'list', query] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
  members: (id: string) => ['projects', 'members', id] as const,
}

export function useProjects(query: ProjectQuery) {
  return useQuery({
    queryKey: projectKeys.list(query),
    queryFn: () => listProjects(query),
    placeholderData: keepPreviousData,
  })
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.detail(id ?? ''),
    queryFn: () => getProject(id as string),
    enabled: Boolean(id),
  })
}

export function useProjectMembers(id: string | undefined) {
  return useQuery({
    queryKey: projectKeys.members(id ?? ''),
    queryFn: () => listProjectMembers(id as string),
    enabled: Boolean(id),
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProjectInput) => createProject(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ProjectInput) => updateProject(id, input),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(id), project)
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useDeleteProject(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteProject(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useAddProjectMember(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { email: string; project_role: ProjectRole }) =>
      addProjectMember(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useUpdateProjectMemberRole(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, projectRole }: { userId: string; projectRole: ProjectRole }) =>
      updateProjectMemberRole(projectId, userId, projectRole),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}

export function useRemoveProjectMember(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => removeProjectMember(projectId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.members(projectId) })
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
    },
  })
}
