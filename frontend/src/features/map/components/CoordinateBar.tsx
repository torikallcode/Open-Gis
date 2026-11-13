import { formatCoordinate, formatMetric } from '../format'
import type { CursorPosition } from '../types'

interface CoordinateBarProps {
  cursor: CursorPosition | null
  projectCrsLabel: string
}

export function CoordinateBar({ cursor, projectCrsLabel }: CoordinateBarProps) {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-lg bg-slate-900/85 px-3 py-2 font-mono text-[11px] leading-tight text-slate-100 shadow-lg">
      {cursor ? (
        <>
          <div>
            Lon, Lat: {formatCoordinate(cursor.lon)}, {formatCoordinate(cursor.lat)}
          </div>
          <div className="text-slate-300">
            E, N: {formatMetric(cursor.easting)} / {formatMetric(cursor.northing)} · {projectCrsLabel}
          </div>
        </>
      ) : (
        <div className="text-slate-300">Gerakkan kursor untuk melihat koordinat</div>
      )}
    </div>
  )
}
