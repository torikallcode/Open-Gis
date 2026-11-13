import type { FeatureLike } from 'ol/Feature'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'

import type { LayerId } from './types'

export const STATUS_COLORS: Record<string, string> = {
  approved: '#10b981',
  submitted: '#f59e0b',
  draft: '#64748b',
  rejected: '#f43f5e',
}

export const STATUS_LEGEND = [
  { label: 'Disetujui', color: STATUS_COLORS.approved },
  { label: 'Diajukan', color: STATUS_COLORS.submitted },
  { label: 'Draf', color: STATUS_COLORS.draft },
  { label: 'Ditolak', color: STATUS_COLORS.rejected },
]

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

export function parcelStyle(feature: FeatureLike): Style {
  const status = String(feature.get('verification_status') ?? '')
  const color = STATUS_COLORS[status] ?? '#3b82f6'

  return new Style({
    fill: new Fill({ color: withAlpha(color, 0.35) }),
    stroke: new Stroke({ color, width: 2 }),
    text: new Text({
      text: String(feature.get('parcel_code') ?? ''),
      font: '600 12px Inter, ui-sans-serif, sans-serif',
      fill: new Fill({ color: '#0f172a' }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
      overflow: true,
    }),
  })
}

export function pointStyle(): Style {
  return new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: '#0f172a', width: 2 }),
    }),
  })
}

export const surveyAreaStyle = new Style({
  fill: new Fill({ color: 'rgba(14, 165, 233, 0.06)' }),
  stroke: new Stroke({ color: '#0ea5e9', width: 2, lineDash: [8, 6] }),
})

export function layerStyle(id: LayerId) {
  switch (id) {
    case 'parcels':
      return parcelStyle
    case 'survey-points':
      return pointStyle
    default:
      return surveyAreaStyle
  }
}

export const measureStyle = new Style({
  fill: new Fill({ color: 'rgba(225, 29, 72, 0.15)' }),
  stroke: new Stroke({ color: '#e11d48', width: 2, lineDash: [6, 4] }),
  image: new CircleStyle({
    radius: 5,
    fill: new Fill({ color: '#e11d48' }),
  }),
})
