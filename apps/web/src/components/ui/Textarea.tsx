import * as React from "react"
import { cn } from "../../lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-on-surface-variant font-label"
          >
            {label}
          </label>
        )}
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border-b border-outline bg-surface-container-lowest px-3 py-2 text-sm text-on-surface ring-offset-background placeholder:text-on-surface-variant font-body",
            "transition-all duration-200 outline-none",
            "focus:border-primary focus:bg-surface-container-highest focus:text-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-error text-error focus:border-error focus:text-error",
            className
          )}
          id={textareaId}
          ref={ref}
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
Textarea.displayName = "Textarea"

export { Textarea }
