import { BASEMAP_OPTIONS } from '../constants'
import type { BasemapId } from '../types'

interface BasemapSwitcherProps {
  value: BasemapId
  onChange: (id: BasemapId) => void
}

export function BasemapSwitcher({ value, onChange }: BasemapSwitcherProps) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Basemap
      </legend>
      <div className="mt-2 space-y-1">
        {BASEMAP_OPTIONS.map((option) => (
          <label
            key={option.id}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
          >
            <input
              type="radio"
              name="basemap"
              value={option.id}
              checked={value === option.id}
              onChange={() => onChange(option.id)}
              className="size-3.5 accent-slate-900"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
