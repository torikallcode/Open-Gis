import { useCallback, useEffect, useRef, useState } from 'react'

import { defaults as defaultControls } from 'ol/control'
import ScaleLine from 'ol/control/ScaleLine'
import type { FeatureLike } from 'ol/Feature'
import type { Coordinate } from 'ol/coordinate'
import GeoJSON from 'ol/format/GeoJSON'
import LineString from 'ol/geom/LineString'
import Polygon from 'ol/geom/Polygon'
import Draw from 'ol/interaction/Draw'
import TileLayer from 'ol/layer/Tile'
import type BaseLayer from 'ol/layer/Base'
import VectorLayer from 'ol/layer/Vector'
import OlMap from 'ol/Map'
import Overlay from 'ol/Overlay'
import { fromLonLat, toLonLat, transform } from 'ol/proj'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import View from 'ol/View'

import {
  BASEMAP_ATTRIBUTION,
  BASEMAP_HOT_TILE_URL,
  BASEMAP_TILE_URL,
  LAYER_DEFINITIONS,
  MAP_CENTER,
  MAP_ZOOM,
  PROJECT_CRS,
  PROPERTY_LABELS,
  STATUS_LABELS,
  VIEW_PROJECTION,
  dataUrl,
} from './constants'
import { formatArea, formatDistance } from './format'
import { layerStyle, measureStyle } from './styles'
import type {
  BasemapId,
  CursorPosition,
  LayerId,
  LayerUiState,
  MeasureKind,
  PopupData,
  PopupRow,
} from './types'

function asText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function buildPopup(feature: FeatureLike, coordinate: Coordinate): PopupData {
  const properties = feature.getProperties()
  const parcelCode = asText(properties['parcel_code'])
  const pointCode = asText(properties['point_code'])
  const name = asText(properties['name'])

  let title = 'Fitur peta'
  let subtitle = 'Data contoh'

  if (parcelCode) {
    title = parcelCode
    subtitle = 'Bidang tanah'
  } else if (pointCode) {
    title = pointCode
    subtitle = 'Titik survei'
  } else if (name) {
    title = name
    subtitle = 'Area kerja'
  }

  const rows: PopupRow[] = []
  for (const [key, label] of Object.entries(PROPERTY_LABELS)) {
    const raw = properties[key]
    if (raw === undefined || raw === null || raw === '') {
      continue
    }
    const value =
      key === 'verification_status'
        ? (STATUS_LABELS[String(raw)] ?? String(raw))
        : String(raw)

    rows.push({ label, value })
  }

  return { title, subtitle, rows, coordinate }
}

function basemapSource(id: BasemapId): XYZ {
  return new XYZ({
    url: id === 'hot' ? BASEMAP_HOT_TILE_URL : BASEMAP_TILE_URL,
    attributions: BASEMAP_ATTRIBUTION,
    crossOrigin: 'anonymous',
  })
}

export function useOpenLayersMap() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const popupElementRef = useRef<HTMLDivElement | null>(null)

  const mapRef = useRef<OlMap | null>(null)
  const baseLayerRef = useRef<TileLayer<XYZ> | null>(null)
  const layerRefs = useRef(new globalThis.Map<LayerId, VectorLayer>())
  const measureLayerRef = useRef<VectorLayer | null>(null)
  const measureSourceRef = useRef<VectorSource | null>(null)
  const overlayRef = useRef<Overlay | null>(null)
  const initialBasemapApplied = useRef(false)
  const measuringRef = useRef(false)

  const [layers, setLayers] = useState<LayerUiState[]>(() =>
    LAYER_DEFINITIONS.map((definition) => ({ ...definition, visible: true, opacity: 100 })),
  )
  const [layerOrder, setLayerOrder] = useState<LayerId[]>(() =>
    LAYER_DEFINITIONS.map((definition) => definition.id),
  )
  const [basemap, setBasemap] = useState<BasemapId>('osm')
  const [cursor, setCursor] = useState<CursorPosition | null>(null)
  const [popup, setPopup] = useState<PopupData | null>(null)
  const [activeMeasure, setActiveMeasure] = useState<MeasureKind | null>(null)
  const [measurement, setMeasurement] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const format = new GeoJSON()
    const layerRegistry = layerRefs.current
    const baseLayer = new TileLayer({ source: basemapSource('osm'), zIndex: 0 })
    baseLayerRef.current = baseLayer

    const vectorLayers: VectorLayer[] = []
    for (const definition of LAYER_DEFINITIONS) {
      const layer = new VectorLayer({
        source: new VectorSource({
          url: dataUrl(definition.file),
          format,
          wrapX: false,
        }),
        style: layerStyle(definition.id),
      })
      layer.set('id', definition.id)
      layer.setZIndex(definition.initialZIndex)
      layerRegistry.set(definition.id, layer)
      vectorLayers.push(layer)
    }

    const measureSource = new VectorSource()
    const measureLayer = new VectorLayer({
      source: measureSource,
      style: measureStyle,
      zIndex: 100,
    })
    measureLayer.set('id', 'measure')
    measureSourceRef.current = measureSource
    measureLayerRef.current = measureLayer

    const map = new OlMap({
      target: container,
      layers: [baseLayer, ...vectorLayers, measureLayer],
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

    if (popupElementRef.current) {
      const overlay = new Overlay({
        element: popupElementRef.current,
        positioning: 'bottom-center',
        offset: [0, -12],
        stopEvent: true,
        autoPan: { animation: { duration: 200 }, margin: 24 },
      })
      map.addOverlay(overlay)
      overlayRef.current = overlay
    }

    let lastMove = 0
    map.on('pointermove', (event) => {
      if (event.dragging) {
        return
      }

      const now = performance.now()
      if (now - lastMove < 50) {
        return
      }
      lastMove = now

      const [lon, lat] = toLonLat(event.coordinate)
      const projected = transform(event.coordinate, VIEW_PROJECTION, PROJECT_CRS)
      setCursor({ lon, lat, easting: projected[0], northing: projected[1] })
    })

    map.on('singleclick', (event) => {
      if (measuringRef.current) {
        return
      }

      let found: FeatureLike | undefined
      map.forEachFeatureAtPixel(
        event.pixel,
        (feature, layer: BaseLayer | null) => {
          if (layer?.get('id') === 'measure') {
            return false
          }
          found = feature
          return true
        },
        { hitTolerance: 6 },
      )

      if (!found) {
        setPopup(null)
        return
      }

      setPopup(buildPopup(found, event.coordinate))
    })

    setReady(true)

    return () => {
      map.setTarget(undefined)
      mapRef.current = null
      baseLayerRef.current = null
      layerRegistry.clear()
      overlayRef.current = null
      measureLayerRef.current = null
      measureSourceRef.current = null
      initialBasemapApplied.current = false
      setReady(false)
    }
  }, [])

  useEffect(() => {
    for (const state of layers) {
      const layer = layerRefs.current.get(state.id)
      if (!layer) {
        continue
      }
      layer.setVisible(state.visible)
      layer.setOpacity(state.opacity / 100)
    }
  }, [layers])

  useEffect(() => {
    layerOrder.forEach((id, index) => {
      layerRefs.current.get(id)?.setZIndex(10 + index)
    })
  }, [layerOrder])

  useEffect(() => {
    if (!initialBasemapApplied.current) {
      initialBasemapApplied.current = true
      return
    }

    const layer = baseLayerRef.current
    if (!layer) {
      return
    }

    if (basemap === 'none') {
      layer.setVisible(false)
      return
    }

    layer.setVisible(true)
    layer.setSource(basemapSource(basemap))
  }, [basemap])

  useEffect(() => {
    overlayRef.current?.setPosition(popup ? popup.coordinate : undefined)
  }, [popup])

  useEffect(() => {
    measuringRef.current = activeMeasure !== null
  }, [activeMeasure])

  useEffect(() => {
    const map = mapRef.current
    const source = measureSourceRef.current
    if (!map || !source || !activeMeasure) {
      return
    }

    const draw = new Draw({
      source,
      type: activeMeasure === 'distance' ? 'LineString' : 'Polygon',
      style: measureStyle,
    })

    draw.on('drawend', (event) => {
      const geometry = event.feature.getGeometry()
      if (!geometry) {
        return
      }

      const metricGeometry = geometry.clone()
      metricGeometry.transform(VIEW_PROJECTION, PROJECT_CRS)

      if (activeMeasure === 'distance' && metricGeometry instanceof LineString) {
        setMeasurement(`Jarak: ${formatDistance(metricGeometry.getLength())}`)
      } else if (metricGeometry instanceof Polygon) {
        setMeasurement(`Luas: ${formatArea(metricGeometry.getArea())}`)
      }

      setActiveMeasure(null)
      measuringRef.current = false
    })

    map.addInteraction(draw)

    return () => {
      map.removeInteraction(draw)
    }
  }, [activeMeasure])

  const setLayerVisibility = useCallback((id: LayerId, visible: boolean) => {
    setLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, visible } : layer)),
    )
  }, [])

  const setLayerOpacity = useCallback((id: LayerId, opacity: number) => {
    setLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, opacity } : layer)),
    )
  }, [])

  const moveLayer = useCallback((id: LayerId, direction: 1 | -1) => {
    setLayerOrder((current) => {
      const index = current.indexOf(id)
      const target = index + direction

      if (index < 0 || target < 0 || target >= current.length) {
        return current
      }

      const next = [...current]
      const swapped = next[target]
      next[target] = next[index]
      next[index] = swapped
      return next
    })
  }, [])

  const startMeasure = useCallback((kind: MeasureKind) => {
    setActiveMeasure((current) => (current === kind ? null : kind))
  }, [])

  const clearMeasure = useCallback(() => {
    measureSourceRef.current?.clear()
    setMeasurement(null)
    setActiveMeasure(null)
  }, [])

  const focusArea = useCallback(() => {
    const map = mapRef.current
    const source = layerRefs.current.get('survey-area')?.getSource()
    if (!map || !source) {
      return
    }

    const extent = source.getExtent()
    if (!extent || !Number.isFinite(extent[0]) || !Number.isFinite(extent[2])) {
      return
    }

    map.getView().fit(extent, { padding: [80, 80, 80, 80], maxZoom: 18, duration: 400 })
  }, [])

  const closePopup = useCallback(() => setPopup(null), [])

  return {
    containerRef,
    popupElementRef,
    ready,
    layers,
    layerOrder,
    basemap,
    cursor,
    popup,
    activeMeasure,
    measurement,
    setBasemap,
    setLayerVisibility,
    setLayerOpacity,
    moveLayer,
    startMeasure,
    clearMeasure,
    focusArea,
    closePopup,
  }
}

export type MapController = ReturnType<typeof useOpenLayersMap>
