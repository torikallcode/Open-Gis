import { BasemapSwitcher } from './BasemapSwitcher'
import { MapLegend } from './MapLegend'
import { PROJECT_CRS_LABEL } from '../constants'
import type { BasemapId, LayerId, LayerUiState } from '../types'

const layerSwatches: Record<LayerId, string> = {
  'survey-area': 'bg-sky-500',
  parcels: 'bg-emerald-500',
  'survey-points': 'bg-slate-900',
}

interface LayerPanelProps {
  layers: LayerUiState[]
  order: LayerId[]
  basemap: BasemapId
  onBasemapChange: (id: BasemapId) => void
  onToggleVisibility: (id: LayerId, visible: boolean) => void
  onOpacityChange: (id: LayerId, opacity: number) => void
  onMove: (id: LayerId, direction: 1 | -1) => void
  onFocus: () => void
  onClose: () => void
}

export function LayerPanel({
  layers,
  order,
  basemap,
  onBasemapChange,
  onToggleVisibility,
  onOpacityChange,
  onMove,
  onFocus,
  onClose,
}: LayerPanelProps) {
  const orderedLayers = [...order].reverse().flatMap((id) => {
    const layer = layers.find((candidate) => candidate.id === id)
    return layer ? [layer] : []
  })

  return (
    <aside className="absolute right-4 top-4 z-20 flex max-h-[calc(100%-2rem)] w-80 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-xl backdrop-blur">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Panel peta</h2>
          <p className="text-xs text-slate-500">Layer, basemap, dan legenda</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup panel peta"
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          ×
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <BasemapSwitcher value={basemap} onChange={onBasemapChange} />

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Layer</h3>
          <ul className="mt-2 space-y-3">
            {orderedLayers.map((layer) => {
              const index = order.indexOf(layer.id)
              return (
                <li key={layer.id} className="rounded-lg border border-slate-100 p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={layer.visible}
                        onChange={(event) => onToggleVisibility(layer.id, event.target.checked)}
                        className="size-3.5 accent-slate-900"
                      />
                      <span
                        className={`size-2.5 shrink-0 rounded-full ${layerSwatches[layer.id]}`}
                        aria-hidden="true"
                      />
                      <span className="truncate text-sm font-medium text-slate-800">
                        {layer.title}
                      </span>
                    </label>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => onMove(layer.id, 1)}
                        disabled={index === order.length - 1}
                        aria-label={`Naikkan ${layer.title}`}
                        className="rounded px-1 text-sm text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => onMove(layer.id, -1)}
                        disabled={index === 0}
                        aria-label={`Turunkan ${layer.title}`}
                        className="rounded px-1 text-sm text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  </div>

                  <p className="mt-1 pl-6 text-xs text-slate-500">{layer.description}</p>

                  <label className="mt-2 flex items-center gap-2 pl-6 text-xs text-slate-500">
                    <span className="w-10 shrink-0">Opasitas</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={layer.opacity}
                      onChange={(event) => onOpacityChange(layer.id, Number(event.target.value))}
                      aria-label={`Opasitas ${layer.title}`}
                      className="w-full accent-slate-900"
                    />
                    <span className="w-8 shrink-0 text-right tabular-nums">{layer.opacity}%</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>

        <MapLegend />

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Sistem koordinat
          </h3>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            <li>Tampilan: EPSG:3857 (Web Mercator)</li>
            <li>Data GeoJSON: EPSG:4326</li>
            <li>Proyek: {PROJECT_CRS_LABEL}</li>
          </ul>
        </div>

        <button
          type="button"
          onClick={onFocus}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Fokus ke area kerja
        </button>

        <p className="text-[11px] leading-relaxed text-slate-400">
          Semua fitur pada peta adalah data contoh untuk pengembangan. Tidak ada data
          pertanahan resmi di sini.
        </p>
      </div>
    </aside>
  )
}
