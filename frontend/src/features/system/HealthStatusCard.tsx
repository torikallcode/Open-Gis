import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDateTime, formatUptime } from '@/utils/format'

import { useHealth } from './useHealth'

export function HealthStatusCard() {
  const { data, error, isPending, isFetching, refetch } = useHealth()

  const healthy = data?.health.status === 'ok'
  const database = data?.health.checks.database

  return (
    <Card>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Status Layanan</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pemeriksaan langsung ke backend dan database, diperbarui setiap 30 detik.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? 'Memeriksa…' : 'Periksa ulang'}
        </Button>
      </header>

      {isPending ? (
        <div className="mt-6 flex items-center gap-3 text-sm text-slate-500">
          <Spinner />
          Menghubungi API…
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm">
          <p className="font-medium text-rose-800">API tidak dapat dihubungi</p>
          <p className="mt-1 text-rose-700">{error.message}</p>
          <p className="mt-2 text-xs text-rose-600">
            Pastikan backend berjalan dan dev proxy mengarah ke port yang benar.
          </p>
        </div>
      ) : null}

      {data ? (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={healthy ? 'success' : 'danger'}>
              {healthy ? 'Operasional' : 'Gangguan'}
            </StatusBadge>
            <span className="text-sm text-slate-500">
              HTTP {data.httpStatus} · versi {data.health.version}
            </span>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs font-medium text-slate-500">Database</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {database?.status === 'ok' ? 'Terhubung' : 'Tidak tersedia'}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs font-medium text-slate-500">Latensi ping</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {database ? `${database.latency_ms} ms` : '—'}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs font-medium text-slate-500">Uptime</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {formatUptime(data.health.uptime_seconds)}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-xs font-medium text-slate-500">Diperiksa pada</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-900">
                {formatDateTime(data.health.timestamp)}
              </dd>
            </div>
          </dl>

          {database?.message ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              {database.message}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}
