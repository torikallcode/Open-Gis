import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { surveyKeys } from '@/features/surveys/hooks'
import type { AreaGeometry } from '@/features/surveys/types'

import {
  createParcel,
  deleteParcel,
  getParcel,
  getProjectFeatures,
  listParcels,
  listParcelVersions,
  updateParcel,
  updateParcelGeometry,
  updateParcelStatus,
} from './services'
import type { ParcelInput, ParcelQuery, ParcelUpdateInput } from './types'

export const parcelKeys = {
  all: ['parcels'] as const,
  list: (query: ParcelQuery) => ['parcels', 'list', query] as const,
  detail: (id: string) => ['parcels', 'detail', id] as const,
  versions: (id: string) => ['parcels', 'versions', id] as const,
  features: (projectId: string) => ['projects', projectId, 'features'] as const,
}

export function useParcels(query: ParcelQuery) {
  return useQuery({
    queryKey: parcelKeys.list(query),
    queryFn: () => listParcels(query),
    placeholderData: keepPreviousData,
  })
}

export function useParcel(id: string | undefined) {
  return useQuery({
    queryKey: parcelKeys.detail(id ?? ''),
    queryFn: () => getParcel(id as string),
    enabled: Boolean(id),
  })
}

export function useParcelVersions(id: string | undefined) {
  return useQuery({
    queryKey: parcelKeys.versions(id ?? ''),
    queryFn: () => listParcelVersions(id as string),
    enabled: Boolean(id),
  })
}

export function useProjectFeatures(projectId: string | undefined) {
  return useQuery({
    queryKey: parcelKeys.features(projectId ?? ''),
    queryFn: () => getProjectFeatures(projectId as string),
    enabled: Boolean(projectId),
  })
}

function useInvalidateParcel(projectId?: string) {
  const queryClient = useQueryClient()

  return (id?: string) => {
    void queryClient.invalidateQueries({ queryKey: parcelKeys.all })
    if (id) {
      void queryClient.invalidateQueries({ queryKey: parcelKeys.detail(id) })
      void queryClient.invalidateQueries({ queryKey: parcelKeys.versions(id) })
    }
    if (projectId) {
      void queryClient.invalidateQueries({ queryKey: parcelKeys.features(projectId) })
    }
    void queryClient.invalidateQueries({ queryKey: surveyKeys.all })
  }
}

export function useCreateParcel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: ParcelInput) => createParcel(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: parcelKeys.all })
    },
  })
}

export function useUpdateParcel(id: string, projectId: string) {
  const invalidate = useInvalidateParcel(projectId)

  return useMutation({
    mutationFn: (input: ParcelUpdateInput) => updateParcel(id, input),
    onSuccess: () => invalidate(id),
  })
}

export function useUpdateParcelGeometry(id: string, projectId: string) {
  const invalidate = useInvalidateParcel(projectId)

  return useMutation({
    mutationFn: (input: { boundary: AreaGeometry; change_reason: string }) =>
      updateParcelGeometry(id, input),
    onSuccess: () => invalidate(id),
  })
}

export function useUpdateParcelStatus(id: string, projectId: string) {
  const invalidate = useInvalidateParcel(projectId)

  return useMutation({
    mutationFn: (input: { status: string; note: string }) => updateParcelStatus(id, input),
    onSuccess: () => invalidate(id),
  })
}

export function useDeleteParcel(id: string, projectId: string) {
  const invalidate = useInvalidateParcel(projectId)

  return useMutation({
    mutationFn: () => deleteParcel(id),
    onSuccess: () => invalidate(id),
  })
}
