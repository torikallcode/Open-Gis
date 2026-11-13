import type { TextareaHTMLAttributes } from 'react'

import { controlClass } from './formStyles'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ invalid = false, className = '', ...props }: TextareaProps) {
  return <textarea className={`${controlClass(invalid)} ${className}`} {...props} />
}
