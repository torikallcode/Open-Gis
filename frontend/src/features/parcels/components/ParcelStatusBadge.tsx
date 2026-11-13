import { StatusBadge } from '@/components/ui/StatusBadge'

import { PARCEL_STATUS_LABELS, type ParcelStatus } from '../types'

const tones: Record<ParcelStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  draft: 'neutral',
  submitted: 'warning',
  under_review: 'warning',
  approved: 'success',
  rejected: 'danger',
}

interface ParcelStatusBadgeProps {
  status: ParcelStatus
}

export function ParcelStatusBadge({ status }: ParcelStatusBadgeProps) {
  return (
    <StatusBadge tone={tones[status] ?? 'neutral'}>
      {PARCEL_STATUS_LABELS[status] ?? status}
    </StatusBadge>
  )
}
