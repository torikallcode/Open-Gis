import { request, requestWithMeta, type ApiMeta } from '@/services/api'

import type {
  AreaGeometry,
  Survey,
  SurveyArea,
  SurveyInput,
  SurveyPoint,
  SurveyPointInput,
  SurveyQuery,
} from './types'

export async function listSurveys(
  query: SurveyQuery,
): Promise<{ items: Survey[]; meta: ApiMeta }> {
  const result = await requestWithMeta<Survey[]>('/surveys', {
    query: {
      project_id: query.project_id,
      status: query.status,
      q: query.q,
      from: query.from,
      to: query.to,
      page: query.page,
      per_page: query.per_page,
      sort: query.sort,
      order: query.order,
    },
  })

  return { items: result.data, meta: result.meta }
}

export function getSurvey(id: string): Promise<Survey> {
  return request<Survey>(`/surveys/${id}`)
}

export function createSurvey(input: SurveyInput): Promise<Survey> {
  return request<Survey>('/surveys', { method: 'POST', body: input })
}

export function updateSurvey(id: string, input: SurveyInput): Promise<Survey> {
  return request<Survey>(`/surveys/${id}`, { method: 'PUT', body: input })
}

export function deleteSurvey(id: string): Promise<void> {
  return request<void>(`/surveys/${id}`, { method: 'DELETE' })
}

export function listSurveyAreas(projectId: string): Promise<SurveyArea[]> {
  return request<SurveyArea[]>(`/projects/${projectId}/survey-areas`)
}

export function createSurveyArea(
  projectId: string,
  input: { name: string; boundary: AreaGeometry },
): Promise<SurveyArea> {
  return request<SurveyArea>(`/projects/${projectId}/survey-areas`, {
    method: 'POST',
    body: input,
  })
}

export function deleteSurveyArea(areaId: string): Promise<void> {
  return request<void>(`/survey-areas/${areaId}`, { method: 'DELETE' })
}

export function listSurveyPoints(surveyId: string): Promise<SurveyPoint[]> {
  return request<SurveyPoint[]>(`/surveys/${surveyId}/points`)
}

export function createSurveyPoint(
  surveyId: string,
  input: SurveyPointInput,
): Promise<SurveyPoint> {
  return request<SurveyPoint>(`/surveys/${surveyId}/points`, {
    method: 'POST',
    body: input,
  })
}

export function updateSurveyPoint(
  surveyId: string,
  pointId: string,
  input: SurveyPointInput,
): Promise<SurveyPoint> {
  return request<SurveyPoint>(`/surveys/${surveyId}/points/${pointId}`, {
    method: 'PUT',
    body: input,
  })
}

export function deleteSurveyPoint(surveyId: string, pointId: string): Promise<void> {
  return request<void>(`/surveys/${surveyId}/points/${pointId}`, { method: 'DELETE' })
}
