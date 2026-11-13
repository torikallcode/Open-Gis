import type { Coordinate } from 'ol/coordinate'

export type LayerId = 'survey-area' | 'parcels' | 'survey-points'
export type BasemapId = 'osm' | 'hot' | 'none'
export type MeasureKind = 'distance' | 'area'

export interface LayerDefinition {
  id: LayerId
  title: string
  description: string
  file: string
  initialZIndex: number
}

export interface LayerUiState extends LayerDefinition {
  visible: boolean
  opacity: number
}

export interface CursorPosition {
  lon: number
  lat: number
  easting: number
  northing: number
}

export interface PopupRow {
  label: string
  value: string
}

export interface PopupData {
  title: string
  subtitle: string
  rows: PopupRow[]
  coordinate: Coordinate
}
