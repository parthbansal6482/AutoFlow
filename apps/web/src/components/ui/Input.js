import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// apps/web/src/components/ui/Input.tsx
import { cn } from '../../lib/utils';
export function Input({ label, error, hint, className, id, ...props }) {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (_jsxs("div", { className: "flex flex-col gap-1.5 w-full", children: [label && (_jsx("label", { htmlFor: inputId, className: "text-sm font-medium text-[hsl(var(--foreground))]", children: label })), _jsx("input", { id: inputId, className: cn('h-10 w-full rounded-lg border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm', 'text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))]', 'outline-none ring-offset-[hsl(var(--background))]', 'focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary))] focus-visible:ring-offset-2', 'disabled:cursor-not-allowed disabled:opacity-50', 'transition-shadow duration-150', error && 'border-[hsl(var(--destructive))] focus-visible:ring-[hsl(var(--destructive))]', className), ...props }), error && (_jsx("p", { className: "text-xs text-[hsl(var(--destructive))]", children: error })), hint && !error && (_jsx("p", { className: "text-xs text-[hsl(var(--muted-foreground))]", children: hint }))] }));
}
