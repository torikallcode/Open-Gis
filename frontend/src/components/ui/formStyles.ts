export function controlClass(invalid = false): string {
  const border = invalid
    ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200'
    : 'border-slate-300 focus:border-slate-400 focus:ring-slate-200'

  return `w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 shadow-sm transition placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 ${border}`
}
