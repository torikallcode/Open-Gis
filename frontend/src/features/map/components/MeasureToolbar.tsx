import { Button } from '@/components/ui/Button'

import type { MeasureKind } from '../types'

interface MeasureToolbarProps {
  activeMeasure: MeasureKind | null
  measurement: string | null
  onMeasure: (kind: MeasureKind) => void
  onClear: () => void
}

export function MeasureToolbar({
  activeMeasure,
  measurement,
  onMeasure,
  onClear,
}: MeasureToolbarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur">
      <Button
        variant={activeMeasure === 'distance' ? 'primary' : 'secondary'}
        onClick={() => onMeasure('distance')}
        className="px-3 py-1.5 text-xs"
        aria-pressed={activeMeasure === 'distance'}
      >
        Ukur jarak
      </Button>
      <Button
        variant={activeMeasure === 'area' ? 'primary' : 'secondary'}
        onClick={() => onMeasure('area')}
        className="px-3 py-1.5 text-xs"
        aria-pressed={activeMeasure === 'area'}
      >
        Ukur luas
      </Button>
      <Button
        variant="secondary"
        onClick={onClear}
        className="px-3 py-1.5 text-xs"
        disabled={!measurement && activeMeasure === null}
      >
        Hapus
      </Button>

      {measurement ? (
        <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white">
          {measurement}
        </span>
      ) : (
        <span className="px-1 text-xs text-slate-500">
          {activeMeasure
            ? 'Klik pada peta untuk menggambar, klik dua kali untuk selesai.'
            : 'Pilih alat ukur.'}
        </span>
      )}
    </div>
  )
}
