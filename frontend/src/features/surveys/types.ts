export type SurveyStatus = 'draft' | 'in_progress' | 'completed' | 'cancelled'

export interface Survey {
  id: string
  project_id: string
  project_name: string
  surveyor_id: string
  name: string
  survey_date: string
  method: string
  status: SurveyStatus
  notes: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  point_count: number
}

export interface SurveyInput {
  project_id: string
  surveyor_id?: string
  name: string
  survey_date: string
  method: string
  status: SurveyStatus
  notes: string
}

export interface SurveyQuery {
  project_id?: string
  status?: string
  q?: string
  from?: string
  to?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface PointGeometry {
  type: 'Point'
  coordinates: [number, number]
}

export interface SurveyPoint {
  id: string
  survey_id: string
  point_code: string
  location: PointGeometry
  accuracy_m: number | null
  elevation_m: number | null
  source: string
  recorded_at: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface SurveyPointInput {
  point_code: string
  location: PointGeometry
  accuracy_m?: number | null
  elevation_m?: number | null
  source: string
  recorded_at: string
}

export interface PolygonGeometry {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface MultiPolygonGeometry {
  type: 'MultiPolygon'
  coordinates: number[][][][]
}

export type AreaGeometry = PolygonGeometry | MultiPolygonGeometry

export interface SurveyArea {
  id: string
  project_id: string
  name: string
  boundary: AreaGeometry
  area_m2: number
  area_method: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export const SURVEY_STATUS_LABELS: Record<SurveyStatus, string> = {
  draft: 'Draf',
  in_progress: 'Berjalan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const SURVEY_STATUS_OPTIONS: { value: SurveyStatus; label: string }[] = (
  Object.keys(SURVEY_STATUS_LABELS) as SurveyStatus[]
).map((value) => ({ value, label: SURVEY_STATUS_LABELS[value] }))
