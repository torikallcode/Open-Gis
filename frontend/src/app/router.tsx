import { createBrowserRouter } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/features/dashboard/DashboardPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    hydrateFallbackElement: (
      <div className="grid h-dvh place-items-center text-sm text-slate-500">Memuat…</div>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'map',
        lazy: async () => {
          const { MapPage } = await import('@/features/map/MapPage')
          return { Component: MapPage }
        },
      },
      {
        path: 'projects',
        lazy: async () => {
          const { ProjectsPage } = await import('@/features/projects/ProjectsPage')
          return { Component: ProjectsPage }
        },
      },
      {
        path: 'projects/new',
        lazy: async () => {
          const { ProjectFormPage } = await import('@/features/projects/ProjectFormPage')
          return { Component: ProjectFormPage }
        },
      },
      {
        path: 'projects/:projectId',
        lazy: async () => {
          const { ProjectDetailPage } = await import('@/features/projects/ProjectDetailPage')
          return { Component: ProjectDetailPage }
        },
      },
      {
        path: 'projects/:projectId/edit',
        lazy: async () => {
          const { ProjectFormPage } = await import('@/features/projects/ProjectFormPage')
          return { Component: ProjectFormPage }
        },
      },
      {
        path: 'surveys',
        lazy: async () => {
          const { SurveysPage } = await import('@/features/surveys/SurveysPage')
          return { Component: SurveysPage }
        },
      },
      {
        path: 'surveys/new',
        lazy: async () => {
          const { SurveyFormPage } = await import('@/features/surveys/SurveyFormPage')
          return { Component: SurveyFormPage }
        },
      },
      {
        path: 'surveys/:surveyId',
        lazy: async () => {
          const { SurveyDetailPage } = await import('@/features/surveys/SurveyDetailPage')
          return { Component: SurveyDetailPage }
        },
      },
      {
        path: 'surveys/:surveyId/edit',
        lazy: async () => {
          const { SurveyFormPage } = await import('@/features/surveys/SurveyFormPage')
          return { Component: SurveyFormPage }
        },
      },
      {
        path: 'parcels',
        lazy: async () => {
          const { ParcelsPage } = await import('@/features/parcels/ParcelsPage')
          return { Component: ParcelsPage }
        },
      },
      {
        path: 'parcels/new',
        lazy: async () => {
          const { ParcelFormPage } = await import('@/features/parcels/ParcelFormPage')
          return { Component: ParcelFormPage }
        },
      },
      {
        path: 'parcels/:parcelId',
        lazy: async () => {
          const { ParcelDetailPage } = await import('@/features/parcels/ParcelDetailPage')
          return { Component: ParcelDetailPage }
        },
      },
      {
        path: 'parcels/:parcelId/edit',
        lazy: async () => {
          const { ParcelFormPage } = await import('@/features/parcels/ParcelFormPage')
          return { Component: ParcelFormPage }
        },
      },
    ],
  },
])
