import { STATUS_LEGEND } from '../styles'

export function MapLegend() {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Legenda bidang
      </h3>
      <ul className="mt-2 grid grid-cols-2 gap-1.5">
        {STATUS_LEGEND.map((entry) => (
          <li key={entry.label} className="flex items-center gap-2 text-xs text-slate-600">
            <span
              className="size-3 rounded-sm border"
              style={{ backgroundColor: `${entry.color}59`, borderColor: entry.color }}
              aria-hidden="true"
            />
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
