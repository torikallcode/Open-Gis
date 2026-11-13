import { useEffect, useRef } from 'react'

import { defaults as defaultControls } from 'ol/control'
import ScaleLine from 'ol/control/ScaleLine'
import Feature from 'ol/Feature'
import type { FeatureLike } from 'ol/Feature'
import GeoJSON from 'ol/format/GeoJSON'
import Point from 'ol/geom/Point'
import Draw from 'ol/interaction/Draw'
import TileLayer from 'ol/layer/Tile'
import VectorLayer from 'ol/layer/Vector'
import OlMap from 'ol/Map'
import { fromLonLat, toLonLat } from 'ol/proj'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style'
import View from 'ol/View'

import {
  BASEMAP_ATTRIBUTION,
  BASEMAP_TILE_URL,
  MAP_CENTER,
  MAP_ZOOM,
} from '@/features/map/constants'

import type { AreaGeometry, SurveyArea, SurveyPoint } from '../types'

import 'ol/ol.css'

export type SurveyMapMode = 'view' | 'draw-area' | 'pick-point'

interface SurveyMapProps {
  areas: SurveyArea[]
  points?: SurveyPoint[]
  mode?: SurveyMapMode
  onAreaDrawn?: (geometry: AreaGeometry) => void
  onPointPicked?: (lon: number, lat: number) => void
}

const areaStyle = new Style({
  fill: new Fill({ color: 'rgba(14, 165, 233, 0.12)' }),
  stroke: new Stroke({ color: '#0284c7', width: 2 }),
})

function pointStyle(feature: FeatureLike): Style {
  return new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: '#ffffff' }),
      stroke: new Stroke({ color: '#0f172a', width: 2 }),
    }),
    text: new Text({
      text: String(feature.get('point_code') ?? ''),
      offsetY: -14,
      font: '600 11px Inter, ui-sans-serif, sans-serif',
      fill: new Fill({ color: '#0f172a' }),
      stroke: new Stroke({ color: '#ffffff', width: 3 }),
    }),
  })
}

const drawStyle = new Style({
  fill: new Fill({ color: 'rgba(225, 29, 72, 0.12)' }),
  stroke: new Stroke({ color: '#e11d48', width: 2, lineDash: [6, 4] }),
  image: new CircleStyle({ radius: 5, fill: new Fill({ color: '#e11d48' }) }),
})

export function SurveyMap({
  areas,
  points = [],
  mode = 'view',
  onAreaDrawn,
  onPointPicked,
}: SurveyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<OlMap | null>(null)
  const areaSourceRef = useRef<VectorSource | null>(null)
  const pointSourceRef = useRef<VectorSource | null>(null)
  const drawSourceRef = useRef<VectorSource | null>(null)
  const fittedRef = useRef(false)
  const callbacksRef = useRef({ onAreaDrawn, onPointPicked })

  useEffect(() => {
    callbacksRef.current = { onAreaDrawn, onPointPicked }
  }, [onAreaDrawn, onPointPicked])

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const areaSource = new VectorSource()
    const pointSource = new VectorSource()
    const drawSource = new VectorSource()
    areaSourceRef.current = areaSource
    pointSourceRef.current = pointSource
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
        new VectorLayer({ source: drawSource, style: drawStyle, zIndex: 20 }),
        new VectorLayer({ source: pointSource, style: pointStyle, zIndex: 30 }),
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
      pointSourceRef.current = null
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
      if (!geometry) {
        continue
      }

      const feature = new Feature({ geometry })
      feature.set('name', area.name)
      source.addFeature(feature)
    }

    if (!fittedRef.current && areas.length > 0) {
      const extent = source.getExtent()
      if (extent && Number.isFinite(extent[0]) && Number.isFinite(extent[2])) {
        map.getView().fit(extent, { padding: [60, 60, 60, 60], maxZoom: 18, duration: 0 })
        fittedRef.current = true
      }
    }
  }, [areas])

  useEffect(() => {
    const source = pointSourceRef.current
    if (!source) {
      return
    }

    source.clear()
    for (const point of points) {
      const feature = new Feature({
        geometry: new Point(fromLonLat(point.location.coordinates)),
      })
      feature.set('point_code', point.point_code)
      source.addFeature(feature)
    }
  }, [points])

  useEffect(() => {
    const map = mapRef.current
    const source = drawSourceRef.current
    if (!map || !source || mode !== 'draw-area') {
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
      const object = format.writeGeometryObject(geographic) as unknown as AreaGeometry
      callbacksRef.current.onAreaDrawn?.(object)

      window.setTimeout(() => source.clear(), 0)
    })

    map.addInteraction(draw)
    return () => {
      map.removeInteraction(draw)
    }
  }, [mode])

  useEffect(() => {
    const map = mapRef.current
    if (!map || mode !== 'pick-point') {
      return
    }

    const handleClick = (event: { coordinate: number[] }) => {
      const [lon, lat] = toLonLat(event.coordinate)
      callbacksRef.current.onPointPicked?.(lon, lat)
    }

    map.on('singleclick', handleClick)
    return () => {
      map.un('singleclick', handleClick)
    }
  }, [mode])

  return <div ref={containerRef} className="h-full w-full" />
}
