import { request, requestWithMeta, type ApiMeta } from '@/services/api'

import type {
  AreaGeometry,
} from '@/features/surveys/types'

import type {
  Parcel,
  ParcelFeatureCollection,
  ParcelInput,
  ParcelQuery,
  ParcelUpdateInput,
  ParcelVersion,
} from './types'

export async function listParcels(
  query: ParcelQuery,
): Promise<{ items: Parcel[]; meta: ApiMeta }> {
  const result = await requestWithMeta<Parcel[]>('/parcels', {
    query: {
      project_id: query.project_id,
      survey_id: query.survey_id,
      status: query.status,
      q: query.q,
      page: query.page,
      per_page: query.per_page,
      sort: query.sort,
      order: query.order,
    },
  })

  return { items: result.data, meta: result.meta }
}

export function getParcel(id: string): Promise<Parcel> {
  return request<Parcel>(`/parcels/${id}`)
}

export function createParcel(input: ParcelInput): Promise<Parcel> {
  return request<Parcel>('/parcels', { method: 'POST', body: input })
}

export function updateParcel(id: string, input: ParcelUpdateInput): Promise<Parcel> {
  return request<Parcel>(`/parcels/${id}`, { method: 'PUT', body: input })
}

export function deleteParcel(id: string): Promise<void> {
  return request<void>(`/parcels/${id}`, { method: 'DELETE' })
}

export function updateParcelGeometry(
  id: string,
  input: { boundary: AreaGeometry; change_reason: string },
): Promise<Parcel> {
  return request<Parcel>(`/parcels/${id}/geometry`, { method: 'PUT', body: input })
}

export function updateParcelStatus(
  id: string,
  input: { status: string; note: string },
): Promise<Parcel> {
  return request<Parcel>(`/parcels/${id}/status`, { method: 'PUT', body: input })
}

export function listParcelVersions(id: string): Promise<ParcelVersion[]> {
  return request<ParcelVersion[]>(`/parcels/${id}/versions`)
}

export function getProjectFeatures(projectId: string): Promise<ParcelFeatureCollection> {
  return request<ParcelFeatureCollection>(`/projects/${projectId}/features`)
}
