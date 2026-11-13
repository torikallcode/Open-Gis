import type { ReactNode } from 'react'

type Tone = 'info' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  danger: 'border-rose-200 bg-rose-50 text-rose-800',
}

interface AlertProps {
  tone?: Tone
  title?: string
  children: ReactNode
  className?: string
}

export function Alert({ tone = 'info', title, children, className = '' }: AlertProps) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]} ${className}`} role="alert">
      {title ? <p className="font-medium">{title}</p> : null}
      <div className={title ? 'mt-1' : ''}>{children}</div>
    </div>
  )
}
