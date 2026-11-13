import { StatusBadge } from '@/components/ui/StatusBadge'

import { SURVEY_STATUS_LABELS, type SurveyStatus } from '../types'

const tones: Record<SurveyStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
}

interface SurveyStatusBadgeProps {
  status: SurveyStatus
}

export function SurveyStatusBadge({ status }: SurveyStatusBadgeProps) {
  return (
    <StatusBadge tone={tones[status] ?? 'neutral'}>
      {SURVEY_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  )
}
