import { useEffect, useRef, useState } from 'react'

import { defaults as defaultControls } from 'ol/control'
import ScaleLine from 'ol/control/ScaleLine'
import Feature from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import Draw from 'ol/interaction/Draw'
import Modify from 'ol/interaction/Modify'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import OlMap from 'ol/Map'
import { fromLonLat } from 'ol/proj'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import View from 'ol/View'

import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import {
  BASEMAP_ATTRIBUTION,
  BASEMAP_TILE_URL,
  MAP_CENTER,
  MAP_ZOOM,
} from '@/features/map/constants'
import type { AreaGeometry, SurveyArea } from '@/features/surveys/types'
import { ApiError } from '@/services/api'

import { useUpdateParcelGeometry } from '../hooks'
import type { Parcel } from '../types'

import 'ol/ol.css'

interface ParcelMapEditorProps {
  parcel: Parcel
  areas: SurveyArea[]
  editable: boolean
}

const areaStyle = new Style({
  fill: new Fill({ color: 'rgba(14, 165, 233, 0.06)' }),
  stroke: new Stroke({ color: '#0ea5e9', width: 2, lineDash: [8, 6] }),
})

const parcelStyle = new Style({
  fill: new Fill({ color: 'rgba(16, 185, 129, 0.25)' }),
  stroke: new Stroke({ color: '#047857', width: 2 }),
  image: new CircleStyle({ radius: 5, fill: new Fill({ color: '#047857' }) }),
})

const drawStyle = new Style({
  fill: new Fill({ color: 'rgba(225, 29, 72, 0.15)' }),
  stroke: new Stroke({ color: '#e11d48', width: 2, lineDash: [6, 4] }),
  image: new CircleStyle({ radius: 5, fill: new Fill({ color: '#e11d48' }) }),
})

export function ParcelMapEditor({ parcel, areas, editable }: ParcelMapEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<OlMap | null>(null)
  const parcelSourceRef = useRef<VectorSource | null>(null)
  const areaSourceRef = useRef<VectorSource | null>(null)
  const drawSourceRef = useRef<VectorSource | null>(null)
  const fittedRef = useRef(false)

  const [drawing, setDrawing] = useState(false)
  const [boundary, setBoundary] = useState<AreaGeometry | null>(null)
  const [changeReason, setChangeReason] = useState('')
  const [generalError, setGeneralError] = useState<string | null>(null)

  const updateGeometry = useUpdateParcelGeometry(parcel.id, parcel.project_id)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const areaSource = new VectorSource()
    const parcelSource = new VectorSource()
    const drawSource = new VectorSource()
    areaSourceRef.current = areaSource
    parcelSourceRef.current = parcelSource
    drawSourceRef.current = drawSource

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
        new VectorLayer({ source: areaSource, style: areaStyle, zIndex: 10 }),
        new VectorLayer({ source: parcelSource, style: parcelStyle, zIndex: 20 }),
        new VectorLayer({ source: drawSource, style: drawStyle, zIndex: 30 }),
      ],
      view: new View({
        center: fromLonLat(MAP_CENTER),
        zoom: MAP_ZOOM,
        minZoom: 4,
        maxZoom: 20,
      }),
      controls: defaultControls({ attributionOptions: { collapsible: true } }).extend([
        new ScaleLine({ units: 'metric' }),
      ]),
    })
    mapRef.current = map

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
      areaSourceRef.current = null
      parcelSourceRef.current = null
      drawSourceRef.current = null
      fittedRef.current = false
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const source = areaSourceRef.current
    if (!map || !source) {
      return
    }

    const format = new GeoJSON()
    source.clear()

    for (const area of areas) {
      const geometry = format.readGeometry(
        area.boundary as unknown as Parameters<GeoJSON['readGeometry']>[0],
        { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
      )
      if (geometry) {
        source.addFeature(new Feature({ geometry }))
      }
    }
  }, [areas])

  useEffect(() => {
    const map = mapRef.current
    const source = parcelSourceRef.current
    if (!map || !source) {
      return
    }

    const format = new GeoJSON()
    const geometry = format.readGeometry(
      parcel.boundary as unknown as Parameters<GeoJSON['readGeometry']>[0],
      { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
    )

    source.clear()
    setBoundary(null)
    setDrawing(false)
    setChangeReason('')

    if (!geometry) {
      return
    }

    source.addFeature(new Feature({ geometry }))

    if (!fittedRef.current) {
      const extent = source.getExtent()
      if (extent && Number.isFinite(extent[0]) && Number.isFinite(extent[2])) {
        map.getView().fit(extent, { padding: [80, 80, 80, 80], maxZoom: 19, duration: 0 })
        fittedRef.current = true
      }
    }
  }, [parcel.id, parcel.boundary])

  useEffect(() => {
    const map = mapRef.current
    const source = parcelSourceRef.current
    if (!map || !source || !editable || drawing) {
      return
    }

    const modify = new Modify({ source })
    modify.on('modifyend', () => {
      const feature = source.getFeatures()[0]
      const geometry = feature?.getGeometry()
      if (!geometry) {
        return
      }

      const format = new GeoJSON()
      const geographic = geometry.clone()
      geographic.transform('EPSG:3857', 'EPSG:4326')
      setBoundary(format.writeGeometryObject(geographic) as unknown as AreaGeometry)
      setGeneralError(null)
    })

    map.addInteraction(modify)
    return () => {
      map.removeInteraction(modify)
    }
  }, [editable, drawing, parcel.id])

  useEffect(() => {
    const map = mapRef.current
    const source = drawSourceRef.current
    if (!map || !source || !drawing) {
      return
    }

    const format = new GeoJSON()
    const draw = new Draw({ source, type: 'Polygon', style: drawStyle })

    draw.on('drawend', (event) => {
      const geometry = event.feature.getGeometry()
      if (!geometry) {
        return
      }

      const geographic = geometry.clone()
      geographic.transform('EPSG:3857', 'EPSG:4326')
      setBoundary(format.writeGeometryObject(geographic) as unknown as AreaGeometry)
      setDrawing(false)

      const parcelSource = parcelSourceRef.current
      if (parcelSource) {
        parcelSource.clear()
        parcelSource.addFeature(new Feature({ geometry: geometry.clone() }))
      }

      window.setTimeout(() => source.clear(), 0)
    })

    map.addInteraction(draw)
    return () => {
      map.removeInteraction(draw)
    }
  }, [drawing])

  function handleSave() {
    if (!boundary) {
      return
    }

    setGeneralError(null)
    updateGeometry.mutate(
      { boundary, change_reason: changeReason },
      {
        onSuccess: () => {
          setBoundary(null)
          setChangeReason('')
        },
        onError: (error) => {
          setGeneralError(
            error instanceof ApiError ? error.message : 'Geometri tidak dapat disimpan.',
          )
        },
      },
    )
  }

  function handleReset() {
    const source = parcelSourceRef.current
    const map = mapRef.current
    if (!source || !map) {
      return
    }

    const format = new GeoJSON()
    const geometry = format.readGeometry(
      parcel.boundary as unknown as Parameters<GeoJSON['readGeometry']>[0],
      { dataProjection: 'EPSG:4326', featureProjection: 'EPSG:3857' },
    )
    source.clear()
    if (geometry) {
      source.addFeature(new Feature({ geometry }))
    }
    setBoundary(null)
    setDrawing(false)
    setChangeReason('')
    setGeneralError(null)
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Geometri bidang</h2>
          <p className="text-xs text-slate-500">
            Geser vertex dengan Modify, atau gambar ulang polygon. Luas dihitung backend.
          </p>
        </div>
        {editable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setDrawing((current) => !current)
                setGeneralError(null)
              }}
              className="px-3 py-1.5 text-xs"
            >
              {drawing ? 'Batalkan gambar' : 'Gambar ulang'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs"
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!boundary || updateGeometry.isPending}
              className="px-3 py-1.5 text-xs"
            >
              {updateGeometry.isPending ? 'Menyimpan…' : 'Simpan geometri'}
            </Button>
          </div>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
            Geometri terkunci pada status ini
          </span>
        )}
      </div>

      <div className="relative h-[400px]">
        <div ref={containerRef} className="h-full w-full" />
        {drawing ? (
          <div className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-lg bg-slate-900/85 px-3 py-1.5 text-xs text-white shadow">
            Klik untuk menggambar polygon, klik dua kali untuk selesai.
          </div>
        ) : null}
      </div>

      {editable && boundary ? (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-medium text-slate-700">
            Geometri berubah dan siap disimpan.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <Field
              label="Alasan perubahan"
              htmlFor="change_reason"
              hint="Opsional, disimpan di riwayat versi."
              className="min-w-64 flex-1"
            >
              <Input
                id="change_reason"
                value={changeReason}
                onChange={(event) => setChangeReason(event.target.value)}
                maxLength={1000}
                placeholder="Contoh: koreksi batas lapangan"
              />
            </Field>
            <Button onClick={handleSave} disabled={updateGeometry.isPending} className="px-3 py-2 text-xs">
              {updateGeometry.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </div>
        </div>
      ) : null}

      {generalError ? (
        <div className="border-t border-slate-100 p-3">
          <Alert tone="danger">{generalError}</Alert>
        </div>
      ) : null}
    </div>
  )
}
