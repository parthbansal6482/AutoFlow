// apps/web/src/components/ui/Input.tsx
import { cn } from '../../lib/utils'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[hsl(var(--foreground))]"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm',
          'text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]',
          'outline-none ring-offset-[hsl(var(--background))]',
          'focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-shadow duration-150',
          error && 'border-[hsl(var(--destructive))] focus-visible:ring-[hsl(var(--destructive))]',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-xs text-[hsl(var(--destructive))]">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-[hsl(var(--muted-foreground))]">{hint}</p>
      )}
    </div>
  )
}
