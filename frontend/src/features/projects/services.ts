import { request, requestWithMeta, type ApiMeta } from '@/services/api'

import type { Project, ProjectInput, ProjectMember, ProjectQuery, ProjectRole } from './types'

export async function listProjects(
  query: ProjectQuery,
): Promise<{ items: Project[]; meta: ApiMeta }> {
  const result = await requestWithMeta<Project[]>('/projects', {
    query: {
      q: query.q,
      status: query.status,
      page: query.page,
      per_page: query.per_page,
      sort: query.sort,
      order: query.order,
    },
  })

  return { items: result.data, meta: result.meta }
}

export function getProject(id: string): Promise<Project> {
  return request<Project>(`/projects/${id}`)
}

export function createProject(input: ProjectInput): Promise<Project> {
  return request<Project>('/projects', { method: 'POST', body: input })
}

export function updateProject(id: string, input: ProjectInput): Promise<Project> {
  return request<Project>(`/projects/${id}`, { method: 'PUT', body: input })
}

export function deleteProject(id: string): Promise<void> {
  return request<void>(`/projects/${id}`, { method: 'DELETE' })
}

export function listProjectMembers(projectId: string): Promise<ProjectMember[]> {
  return request<ProjectMember[]>(`/projects/${projectId}/members`)
}

export function addProjectMember(
  projectId: string,
  input: { email: string; project_role: ProjectRole },
): Promise<ProjectMember> {
  return request<ProjectMember>(`/projects/${projectId}/members`, {
    method: 'POST',
    body: input,
  })
}

export function updateProjectMemberRole(
  projectId: string,
  userId: string,
  projectRole: ProjectRole,
): Promise<ProjectMember> {
  return request<ProjectMember>(`/projects/${projectId}/members/${userId}`, {
    method: 'PUT',
    body: { project_role: projectRole },
  })
}

export function removeProjectMember(projectId: string, userId: string): Promise<void> {
  return request<void>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' })
}
