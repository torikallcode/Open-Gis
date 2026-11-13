import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { buttonClass } from '@/components/ui/buttonStyles'
import Feature from 'ol/Feature'
import type { FeatureLike } from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import OlMap from 'ol/Map'
import Overlay from 'ol/Overlay'
import { fromLonLat } from 'ol/proj'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { Fill, Stroke, Style } from 'ol/style'
import View from 'ol/View'

import { formatArea } from '@/features/map/format'
import {
  BASEMAP_ATTRIBUTION,
  BASEMAP_TILE_URL,
  MAP_CENTER,
  MAP_ZOOM,
} from '@/features/map/constants'

import { useParcels, useProjectFeatures } from '../hooks'
import { PARCEL_STATUS_LABELS, type ParcelStatus } from '../types'
import { ParcelStatusBadge } from './ParcelStatusBadge'

import 'ol/ol.css'

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b',
  submitted: '#f59e0b',
  under_review: '#3b82f6',
  approved: '#10b981',
  rejected: '#f43f5e',
}

function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

function parcelStyle(feature: FeatureLike): Style {
  const status = String(feature.get('verification_status') ?? '')
  const color = STATUS_COLORS[status] ?? '#3b82f6'

  return new Style({
    fill: new Fill({ color: withAlpha(color, 0.3) }),
    stroke: new Stroke({ color, width: 2 }),
  })
}

interface PopupState {
  title: string
  landUse: string
  status: string
  coordinate: number[]
}

interface ProjectParcelsPanelProps {
  projectId: string
}

export function ProjectParcelsPanel({ projectId }: ProjectParcelsPanelProps) {
  const featuresQuery = useProjectFeatures(projectId)
  const parcelsQuery = useParcels({
    project_id: projectId,
    per_page: 100,
    sort: 'parcel_code',
    order: 'asc',
  })

  const containerRef = useRef<HTMLDivElement | null>(null)
  const popupRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<OlMap | null>(null)
  const sourceRef = useRef<VectorSource | null>(null)
  const overlayRef = useRef<Overlay | null>(null)
  const fittedRef = useRef(false)

  const [popup, setPopup] = useState<PopupState | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const source = new VectorSource()
    sourceRef.current = source

    const map = new OlMap({
      target: container,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: BASEMAP_TILE_URL,
            attributions: BASEMAP_ATTRIBUTION,
            crossOrigin: 'anonymous',
          }),
          zIndex: 0,
        }),
        new VectorLayer({ source, style: parcelStyle, zIndex: 10 }),
      ],
      view: new View({
        center: fromLonLat(MAP_CENTER),
        zoom: MAP_ZOOM,
        minZoom: 4,
        maxZoom: 20,
      }),
    })
    mapRef.current = map

    if (popupRef.current) {
      const overlay = new Overlay({
        element: popupRef.current,
        positioning: 'bottom-center',
        offset: [0, -10],
        stopEvent: true,
      })
      map.addOverlay(overlay)
      overlayRef.current = overlay
    }

    map.on('singleclick', (event) => {
      let found: FeatureLike | undefined
      map.forEachFeatureAtPixel(
        event.pixel,
        (feature) => {
          found = feature
          return true
        },
        { hitTolerance: 5 },
      )

      if (!found) {
        setPopup(null)
        return
      }

      setPopup({
        title: String(found.get('parcel_code') ?? 'Bidang'),
        landUse: String(found.get('land_use') ?? ''),
        status: String(found.get('verification_status') ?? ''),
        coordinate: event.coordinate,
      })
    })

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
      sourceRef.current = null
      overlayRef.current = null
      fittedRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const source = sourceRef.current
    const collection = featuresQuery.data
    if (!map || !source || !collection) {
      return
    }

    const format = new GeoJSON()
    source.clear()

    for (const item of collection.features) {
      const geometry = format.readGeometry(
        item.geometry as unknown as Parameters<GeoJSON['readGeometry']>[0],
        { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
      )
      if (!geometry) {
        continue
      }

      const feature = new Feature({ geometry })
      feature.set('parcel_code', item.properties.parcel_code)
      feature.set('land_use', item.properties.land_use)
      feature.set('verification_status', item.properties.verification_status)
      source.addFeature(feature)
    }

    if (!fittedRef.current && collection.features.length > 0) {
      const extent = source.getExtent()
      if (extent && Number.isFinite(extent[0]) && Number.isFinite(extent[2])) {
        map.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 18, duration: 0 })
        fittedRef.current = true
      }
    }
  }, [featuresQuery.data])

  useEffect(() => {
    overlayRef.current?.setPosition(popup ? popup.coordinate : undefined)
  }, [popup])

  const parcels = parcelsQuery.data?.items ?? []

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Peta bidang tanah</h2>
            <p className="text-xs text-slate-500">
              Klik bidang untuk melihat atribut. Warna mengikuti status verifikasi.
            </p>
          </div>
          <Link
            to={`/parcels/new?project_id=${projectId}`}
            className={buttonClass('primary', 'px-3 py-1.5 text-xs')}
          >
            Bidang baru
          </Link>
        </div>

        <div className="relative h-[380px]">
          <div ref={containerRef} className="h-full w-full" />

          <div ref={popupRef}>
            {popup ? (
              <div className="w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <p className="text-sm font-semibold text-slate-900">{popup.title}</p>
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Penggunaan</dt>
                    <dd className="font-medium text-slate-800">{popup.landUse || '—'}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-slate-500">Status</dt>
                    <dd className="font-medium text-slate-800">
                      {PARCEL_STATUS_LABELS[popup.status as ParcelStatus] ?? popup.status}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </div>

          {featuresQuery.isPending ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-slate-500">
              Memuat bidang…
            </div>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {parcels.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Belum ada bidang tanah pada proyek ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Kode</th>
                  <th className="px-4 py-3 font-medium">Penggunaan</th>
                  <th className="px-4 py-3 font-medium">Luas</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Versi</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parcels.map((parcel) => (
                  <tr key={parcel.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        to={`/parcels/${parcel.id}`}
                        className="font-medium text-slate-800 hover:underline"
                      >
                        {parcel.parcel_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{parcel.land_use || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatArea(parcel.area_m2)}</td>
                    <td className="px-4 py-3">
                      <ParcelStatusBadge status={parcel.verification_status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">v{parcel.current_version}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/parcels/${parcel.id}`}
                        className={buttonClass('secondary', 'px-3 py-1.5 text-xs')}
                      >
                        Lihat
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
