// apps/web/src/components/ui/Button.tsx
import { cn } from '../../lib/utils'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
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
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none'

  const variants = {
    primary:
      'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90 focus-visible:ring-[hsl(var(--primary))]',
    secondary:
      'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:opacity-80 focus-visible:ring-[hsl(var(--border))]',
    ghost:
      'bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--secondary))] focus-visible:ring-[hsl(var(--border))]',
    destructive:
      'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:opacity-90 focus-visible:ring-[hsl(var(--destructive))]',
  }

  const sizes = {
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-10 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
