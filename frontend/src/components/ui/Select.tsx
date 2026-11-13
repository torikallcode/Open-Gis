import type { SelectHTMLAttributes } from 'react'

import { controlClass } from './formStyles'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean
}

export function Select({ invalid = false, className = '', children, ...props }: SelectProps) {
  return (
    <select className={`${controlClass(invalid)} ${className}`} {...props}>
      {children}
    </select>
  )
}
