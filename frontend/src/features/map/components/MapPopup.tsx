import type { RefObject } from 'react'

import type { PopupData } from '../types'

interface MapPopupProps {
  elementRef: RefObject<HTMLDivElement | null>
  popup: PopupData | null
  onClose: () => void
}

export function MapPopup({ elementRef, popup, onClose }: MapPopupProps) {
  return (
    <div ref={elementRef}>
      {popup ? (
        <div className="w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{popup.title}</p>
              <p className="text-xs text-slate-500">{popup.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup popup"
              className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              ×
            </button>
          </div>

          {popup.rows.length > 0 ? (
            <dl className="mt-3 space-y-1.5">
              {popup.rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 text-xs">
                  <dt className="shrink-0 text-slate-500">{row.label}</dt>
                  <dd className="text-right font-medium text-slate-800">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}

          <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-400">
            Data contoh (dummy) — bukan data pertanahan resmi.
          </p>
        </div>
      ) : null}
    </div>
  )
}
