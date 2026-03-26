// apps/web/src/pages/Settings.tsx
export default function Settings() {
  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))]">Settings</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-1">Manage global configuration for your AutoFlow cluster.</p>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">API Configuration</h2>
          <div className="grid gap-2">
            <p className="text-sm font-medium text-[hsl(var(--foreground))]">Webhook Base URL</p>
            <p className="text-sm font-mono bg-[hsl(var(--secondary))] p-1.5 rounded text-[hsl(var(--muted-foreground))] w-full cursor-not-allowed select-none">
              https://project-id.supabase.co/functions/v1/webhook-receiver
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Execution Engine</h2>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            Concurrency, polling limits, and storage pruning settings will appear here.
          </p>
        </div>
      </div>
    </div>
  )
}
