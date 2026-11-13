export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived'

export type ProjectRole = 'manager' | 'surveyor' | 'gis_analyst' | 'supervisor' | 'viewer'

export interface Project {
  id: string
  name: string
  description: string
  location: string
  crs_epsg: number
  status: ProjectStatus
  start_date: string
  end_date: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  member_role?: string
}

export interface ProjectMember {
  user_id: string
  name: string
  email: string
  project_role: ProjectRole
  joined_at: string
}

export interface ProjectInput {
  name: string
  description: string
  location: string
  crs_epsg: number
  status: ProjectStatus
  start_date: string
  end_date: string
}

export interface ProjectQuery {
  q?: string
  status?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: 'Perencanaan',
  active: 'Aktif',
  on_hold: 'Ditunda',
  completed: 'Selesai',
  archived: 'Diarsipkan',
}

export const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = (
  Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]
).map((value) => ({ value, label: PROJECT_STATUS_LABELS[value] }))

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  manager: 'Manajer proyek',
  surveyor: 'Surveyor',
  gis_analyst: 'GIS Analyst',
  supervisor: 'Supervisor',
  viewer: 'Penonton',
}

export const PROJECT_ROLE_OPTIONS: { value: ProjectRole; label: string }[] = (
  Object.keys(PROJECT_ROLE_LABELS) as ProjectRole[]
).map((value) => ({ value, label: PROJECT_ROLE_LABELS[value] }))
