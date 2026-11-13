import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

interface AttributeRow {
  id: string
  key: string
  value: string
}

interface AttributesEditorProps {
  initialValue: Record<string, unknown>
  onChange: (value: Record<string, unknown>) => void
}

function toRows(value: Record<string, unknown>): AttributeRow[] {
  return Object.entries(value).map(([key, raw]) => ({
    id: `${key}-${Math.random().toString(36).slice(2, 8)}`,
    key,
    value: typeof raw === 'string' ? raw : JSON.stringify(raw),
  }))
}

function parseValue(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return ''
  }
  if (trimmed === 'true') {
    return true
  }
  if (trimmed === 'false') {
    return false
  }
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed)
  }
  return raw
}

function toObject(rows: AttributeRow[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const row of rows) {
    const key = row.key.trim()
    if (key !== '') {
      result[key] = parseValue(row.value)
    }
  }
  return result
}

export function AttributesEditor({ initialValue, onChange }: AttributesEditorProps) {
  const [rows, setRows] = useState<AttributeRow[]>(() => toRows(initialValue))

  function updateRows(next: AttributeRow[]) {
    setRows(next)
    onChange(toObject(next))
  }

  function addRow() {
    updateRows([
      ...rows,
      { id: crypto.randomUUID(), key: '', value: '' },
    ])
  }

  function removeRow(id: string) {
    updateRows(rows.filter((row) => row.id !== id))
  }

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">
          Belum ada atribut tambahan. Tambahkan pasangan kunci-nilai bila diperlukan.
        </p>
      ) : null}

      {rows.map((row) => (
        <div key={row.id} className="flex flex-wrap items-start gap-2">
          <Input
            value={row.key}
            onChange={(event) =>
              updateRows(rows.map((item) => (item.id === row.id ? { ...item, key: event.target.value } : item)))
            }
            placeholder="Kunci"
            aria-label="Kunci atribut"
            className="min-w-40 flex-1"
          />
          <Input
            value={row.value}
            onChange={(event) =>
              updateRows(rows.map((item) => (item.id === row.id ? { ...item, value: event.target.value } : item)))
            }
            placeholder="Nilai"
            aria-label="Nilai atribut"
            className="min-w-40 flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => removeRow(row.id)}
            className="px-3 py-2 text-xs text-rose-600"
          >
            Hapus
          </Button>
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addRow} className="px-3 py-1.5 text-xs">
        Tambah atribut
      </Button>
    </div>
  )
}
