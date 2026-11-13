import type { InputHTMLAttributes } from 'react'

import { controlClass } from './formStyles'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ invalid = false, className = '', ...props }: InputProps) {
  return <input className={`${controlClass(invalid)} ${className}`} {...props} />
}
