// apps/web/src/components/ui/Input.tsx
import { cn } from '../../lib/utils'
import type { InputHTMLAttributes } from 'react'
import * as React from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-on-surface-variant font-label"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'flex h-10 w-full rounded-t-md border-b border-outline bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant font-body',
            'transition-all duration-200 outline-none',
            'focus:border-primary focus:bg-surface-container-highest focus:text-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-error text-error focus:border-error focus:text-error',
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-error font-body">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-on-surface-variant font-body">{hint}</p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
