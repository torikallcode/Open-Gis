import type { AreaGeometry } from '@/features/surveys/types'

export type ParcelStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'

export interface Parcel {
  id: string
  project_id: string
  survey_id: string
  parcel_code: string
  land_use: string
  notes: string
  attributes: Record<string, unknown>
  boundary: AreaGeometry
  area_m2: number
  area_method: string
  verification_status: ParcelStatus
  review_note: string
  current_version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface ParcelVersion {
  id: string
  parcel_id: string
  version_number: number
  parcel_code: string
  land_use: string
  notes: string
  attributes: Record<string, unknown>
  boundary: AreaGeometry
  area_m2: number
  verification_status: ParcelStatus
  change_reason: string
  changed_by: string
  created_at: string
}

export interface ParcelInput {
  project_id: string
  survey_id: string
  parcel_code: string
  land_use: string
  notes: string
  attributes: Record<string, unknown>
  boundary: AreaGeometry
}

export interface ParcelUpdateInput {
  survey_id: string
  parcel_code: string
  land_use: string
  notes: string
  attributes: Record<string, unknown>
}

export interface ParcelQuery {
  project_id?: string
  survey_id?: string
  status?: string
  q?: string
  page?: number
  per_page?: number
  sort?: string
  order?: 'asc' | 'desc'
}

export interface ParcelFeature {
  type: 'Feature'
  geometry: AreaGeometry
  properties: {
    id: string
    parcel_code: string
    land_use: string
    verification_status: ParcelStatus
    survey_id: string
  }
}

export interface ParcelFeatureCollection {
  type: 'FeatureCollection'
  features: ParcelFeature[]
}

export const PARCEL_STATUS_LABELS: Record<ParcelStatus, string> = {
  draft: 'Draf',
  submitted: 'Diajukan',
  under_review: 'Ditinjau',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

export const PARCEL_STATUS_OPTIONS: { value: ParcelStatus; label: string }[] = (
  Object.keys(PARCEL_STATUS_LABELS) as ParcelStatus[]
).map((value) => ({ value, label: PARCEL_STATUS_LABELS[value] }))
