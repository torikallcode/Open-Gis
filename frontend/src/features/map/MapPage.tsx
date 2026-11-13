import { useState } from 'react'

import { Button } from '@/components/ui/Button'

import { CoordinateBar } from './components/CoordinateBar'
import { LayerPanel } from './components/LayerPanel'
import { MapPopup } from './components/MapPopup'
import { MeasureToolbar } from './components/MeasureToolbar'
import { PROJECT_CRS_LABEL } from './constants'
import { useOpenLayersMap } from './useOpenLayersMap'

import 'ol/ol.css'

export function MapPage() {
  const map = useOpenLayersMap()
  const [panelOpen, setPanelOpen] = useState(true)

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Peta</h1>
          <p className="mt-1 text-sm text-slate-500">
            Layer contoh bidang tanah dan titik survei di Sleman, Yogyakarta.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
            Data dummy
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
            CRS proyek {PROJECT_CRS_LABEL}
          </span>
        </div>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
        <div ref={map.containerRef} className="absolute inset-0" />

        {!map.ready ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-100/80 text-sm text-slate-500">
            Memuat peta…
          </div>
        ) : null}

        <MapPopup elementRef={map.popupElementRef} popup={map.popup} onClose={map.closePopup} />

        <CoordinateBar cursor={map.cursor} projectCrsLabel={PROJECT_CRS_LABEL} />

        <MeasureToolbar
          activeMeasure={map.activeMeasure}
          measurement={map.measurement}
          onMeasure={map.startMeasure}
          onClear={map.clearMeasure}
        />

        {panelOpen ? (
          <LayerPanel
            layers={map.layers}
            order={map.layerOrder}
            basemap={map.basemap}
            onBasemapChange={map.setBasemap}
            onToggleVisibility={map.setLayerVisibility}
            onOpacityChange={map.setLayerOpacity}
            onMove={map.moveLayer}
            onFocus={map.focusArea}
            onClose={() => setPanelOpen(false)}
          />
        ) : (
          <Button
            variant="secondary"
            onClick={() => setPanelOpen(true)}
            className="absolute right-4 top-4 z-20 shadow-lg"
          >
            Panel peta
          </Button>
        )}
      </div>
    </div>
  )
}
