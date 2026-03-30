// apps/web/src/components/ui/Button.tsx
import { cn } from '../../lib/utils'
import type { ButtonHTMLAttributes } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-medium font-body rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:border-b focus-visible:border-primary disabled:pointer-events-none disabled:opacity-50 select-none'

  const variants = {
    primary:
      'bg-primary text-on-primary hover:opacity-90',
    secondary:
      'bg-secondary-container text-on-secondary-container hover:bg-surface-container',
    outline:
      'border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container-highest flex-shrink-0',
    ghost:
      'bg-transparent text-primary hover:bg-surface-container-highest',
    destructive:
      'bg-error text-on-error hover:opacity-90',
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2',
    icon: 'h-10 w-10',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
      )}
      {children}
    </button>
  )
}
