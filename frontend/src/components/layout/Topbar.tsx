export function Topbar() {
  const mode = import.meta.env.MODE

  return (
    <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">ISMW Console</p>
        <p className="text-xs text-slate-500">Integrated Survey &amp; Mapping Web GIS</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {mode}
        </span>
        <span className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">
          <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white">
            D
          </span>
          Aktor dev
        </span>
      </div>
    </header>
  )
}
