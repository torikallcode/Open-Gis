import { Button } from './Button'

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  perPage: number
  disabled?: boolean
  onChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  total,
  perPage,
  disabled = false,
  onChange,
}: PaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * perPage + 1
  const end = Math.min(page * perPage, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
      <p>
        {total === 0 ? 'Tidak ada data' : `Menampilkan ${start}–${end} dari ${total} data`}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          onClick={() => onChange(page - 1)}
          disabled={disabled || page <= 1}
          className="px-3 py-1.5 text-xs"
        >
          Sebelumnya
        </Button>
        <span className="text-xs text-slate-500">
          Halaman {page} dari {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="secondary"
          onClick={() => onChange(page + 1)}
          disabled={disabled || page >= totalPages}
          className="px-3 py-1.5 text-xs"
        >
          Berikutnya
        </Button>
      </div>
    </div>
  )
}
