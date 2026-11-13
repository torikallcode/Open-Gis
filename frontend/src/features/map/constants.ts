import type { BasemapId, LayerDefinition } from './types'

export const PROJECT_CRS = 'EPSG:32749'
export const PROJECT_CRS_LABEL = 'UTM 49S (EPSG:32749)'
export const VIEW_PROJECTION = 'EPSG:3857'
export const DATA_PROJECTION = 'EPSG:4326'

export const MAP_CENTER: [number, number] = [110.3615, -7.801]
export const MAP_ZOOM = 16.4

export const BASEMAP_TILE_URL =
  import.meta.env.VITE_BASEMAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

export const BASEMAP_HOT_TILE_URL = 'https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'

export const BASEMAP_ATTRIBUTION =
  import.meta.env.VITE_BASEMAP_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'

export const BASEMAP_OPTIONS: { id: BasemapId; label: string }[] = [
  { id: 'osm', label: 'OpenStreetMap' },
  { id: 'hot', label: 'OSM Humanitarian' },
  { id: 'none', label: 'Tanpa basemap' },
]

export const LAYER_DEFINITIONS: LayerDefinition[] = [
  {
    id: 'survey-area',
    title: 'Area kerja',
    description: 'Batas area survei (dummy)',
    file: 'dummy-survey-area.geojson',
    initialZIndex: 10,
  },
  {
    id: 'parcels',
    title: 'Bidang tanah',
    description: 'Empat bidang contoh di Sleman (dummy)',
    file: 'dummy-parcels.geojson',
    initialZIndex: 20,
  },
  {
    id: 'survey-points',
    title: 'Titik survei',
    description: 'Enam titik pengukuran contoh (dummy)',
    file: 'dummy-survey-points.geojson',
    initialZIndex: 30,
  },
]

export const PROPERTY_LABELS: Record<string, string> = {
  parcel_code: 'Kode bidang',
  land_use: 'Penggunaan lahan',
  verification_status: 'Status verifikasi',
  point_code: 'Kode titik',
  survey_code: 'Kode survei',
  method: 'Metode',
  accuracy_m: 'Akurasi (m)',
  source: 'Sumber',
  recorded_at: 'Waktu pencatatan',
  name: 'Nama',
  project_code: 'Kode proyek',
  note: 'Catatan',
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draf',
  submitted: 'Diajukan',
  under_review: 'Ditinjau',
  approved: 'Disetujui',
  rejected: 'Ditolak',
}

export function dataUrl(file: string): string {
  return `${import.meta.env.BASE_URL}data/${file}`
}
