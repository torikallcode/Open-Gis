import { StatusBadge } from '@/components/ui/StatusBadge'

import { PROJECT_STATUS_LABELS, type ProjectStatus } from '../types'

const tones: Record<ProjectStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  planning: 'neutral',
  active: 'success',
  on_hold: 'warning',
  completed: 'success',
  archived: 'neutral',
}

interface ProjectStatusBadgeProps {
  status: ProjectStatus
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  return (
    <StatusBadge tone={tones[status] ?? 'neutral'}>
      {PROJECT_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  )
}
