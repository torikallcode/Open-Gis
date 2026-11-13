import { Link } from 'react-router-dom'

import { buttonClass } from '@/components/ui/buttonStyles'

import { SurveyStatusBadge } from './SurveyStatusBadge'
import { useSurveys } from '../hooks'

interface ProjectSurveysPanelProps {
  projectId: string
}

export function ProjectSurveysPanel({ projectId }: ProjectSurveysPanelProps) {
  const surveysQuery = useSurveys({
    project_id: projectId,
    per_page: 100,
    sort: 'survey_date',
    order: 'desc',
  })

  const surveys = surveysQuery.data?.items ?? []

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Kegiatan survei</h2>
          <p className="text-xs text-slate-500">Daftar survei dalam proyek ini.</p>
        </div>
        <Link
          to={`/surveys/new?project_id=${projectId}`}
          className={buttonClass('primary', 'px-3 py-1.5 text-xs')}
        >
          Survei baru
        </Link>
      </div>

      {surveysQuery.isPending ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500">Memuat survei…</div>
      ) : surveys.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500">
          Belum ada survei pada proyek ini.
        </div>
      ) : (
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nama</th>
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Titik</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {surveys.map((survey) => (
              <tr key={survey.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    to={`/surveys/${survey.id}`}
                    className="font-medium text-slate-800 hover:underline"
                  >
                    {survey.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{survey.survey_date || '—'}</td>
                <td className="px-4 py-3">
                  <SurveyStatusBadge status={survey.status} />
                </td>
                <td className="px-4 py-3 text-slate-600">{survey.point_count}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/surveys/${survey.id}`}
                    className={buttonClass('secondary', 'px-3 py-1.5 text-xs')}
                  >
                    Lihat
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
