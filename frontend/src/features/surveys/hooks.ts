import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import {
  createSurvey,
  createSurveyArea,
  createSurveyPoint,
  deleteSurvey,
  deleteSurveyArea,
  deleteSurveyPoint,
  getSurvey,
  listSurveyAreas,
  listSurveyPoints,
  listSurveys,
  updateSurvey,
  updateSurveyPoint,
} from './services'
import type { AreaGeometry, SurveyInput, SurveyPointInput, SurveyQuery } from './types'

export const surveyKeys = {
  all: ['surveys'] as const,
  list: (query: SurveyQuery) => ['surveys', 'list', query] as const,
  detail: (id: string) => ['surveys', 'detail', id] as const,
  points: (id: string) => ['surveys', 'points', id] as const,
  areas: (projectId: string) => ['projects', projectId, 'areas'] as const,
}

export function useSurveys(query: SurveyQuery) {
  return useQuery({
    queryKey: surveyKeys.list(query),
    queryFn: () => listSurveys(query),
    placeholderData: keepPreviousData,
  })
}

export function useSurvey(id: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.detail(id ?? ''),
    queryFn: () => getSurvey(id as string),
    enabled: Boolean(id),
  })
}

export function useSurveyPoints(id: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.points(id ?? ''),
    queryFn: () => listSurveyPoints(id as string),
    enabled: Boolean(id),
  })
}

export function useSurveyAreas(projectId: string | undefined) {
  return useQuery({
    queryKey: surveyKeys.areas(projectId ?? ''),
    queryFn: () => listSurveyAreas(projectId as string),
    enabled: Boolean(projectId),
  })
}

export function useCreateSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SurveyInput) => createSurvey(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyKeys.all })
    },
  })
}

export function useUpdateSurvey(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SurveyInput) => updateSurvey(id, input),
    onSuccess: (survey) => {
      queryClient.setQueryData(surveyKeys.detail(id), survey)
      void queryClient.invalidateQueries({ queryKey: surveyKeys.all })
    },
  })
}

export function useDeleteSurvey(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteSurvey(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyKeys.all })
    },
  })
}

export function useCreateSurveyArea(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { name: string; boundary: AreaGeometry }) =>
      createSurveyArea(projectId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyKeys.areas(projectId) })
    },
  })
}

export function useDeleteSurveyArea(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (areaId: string) => deleteSurveyArea(areaId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyKeys.areas(projectId) })
    },
  })
}

export function useCreateSurveyPoint(surveyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SurveyPointInput) => createSurveyPoint(surveyId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyKeys.points(surveyId) })
      void queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) })
      void queryClient.invalidateQueries({ queryKey: surveyKeys.all })
    },
  })
}

export function useUpdateSurveyPoint(surveyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ pointId, input }: { pointId: string; input: SurveyPointInput }) =>
      updateSurveyPoint(surveyId, pointId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyKeys.points(surveyId) })
      void queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) })
      void queryClient.invalidateQueries({ queryKey: surveyKeys.all })
    },
  })
}

export function useDeleteSurveyPoint(surveyId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pointId: string) => deleteSurveyPoint(surveyId, pointId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: surveyKeys.points(surveyId) })
      void queryClient.invalidateQueries({ queryKey: surveyKeys.detail(surveyId) })
      void queryClient.invalidateQueries({ queryKey: surveyKeys.all })
    },
  })
}
