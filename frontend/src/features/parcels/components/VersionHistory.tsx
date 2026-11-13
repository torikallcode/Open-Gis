import { formatArea } from '@/features/map/format'

import type { ParcelVersion } from '../types'
import { ParcelStatusBadge } from './ParcelStatusBadge'

interface VersionHistoryProps {
  versions: ParcelVersion[]
  loading?: boolean
}

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function VersionHistory({ versions, loading = false }: VersionHistoryProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Riwayat versi</h2>
        <p className="text-xs text-slate-500">
          Setiap perubahan geometri, atribut, atau status menghasilkan snapshot baru.
        </p>
      </div>

      {loading ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500">Memuat versi…</div>
      ) : versions.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500">Belum ada versi.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Versi</th>
                <th className="px-4 py-3 font-medium">Waktu</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Luas</th>
                <th className="px-4 py-3 font-medium">Alasan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {versions.map((version) => (
                <tr key={version.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">v{version.version_number}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatDateTime(version.created_at)}</td>
                  <td className="px-4 py-3">
                    <ParcelStatusBadge status={version.verification_status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatArea(version.area_m2)}</td>
                  <td className="px-4 py-3 text-slate-600">{version.change_reason || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
