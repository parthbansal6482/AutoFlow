# 10 — Realtime Execution Streaming

When a workflow runs, the frontend shows a live panel where each node lights up
one by one as it executes. This is powered by Supabase Realtime — not polling.

---

## Why Realtime instead of polling

Polling (asking the server "are there updates?" every N seconds) is simple but wasteful.
It either queries too frequently (hammers the DB) or too infrequently (feels laggy).

Supabase Realtime uses Postgres logical replication. When a row in `execution_logs`
changes, Postgres emits a replication event. Supabase captures that and pushes it
over a WebSocket connection to any subscribed frontend client — instantly, with no
extra load on the database.

---

## How it works

### Backend side (inside execute-workflow)

As the engine runs each node, it writes to the `execution_logs` table twice:

1. **Before the node runs** — inserts a row with `status: 'running'`
2. **After the node finishes** — updates the row with `status: 'success'` or `'error'`,
   `output_data`, `finished_at`, `duration_ms`

These writes are normal Postgres inserts/updates. Realtime picks them up automatically.

### Frontend side

When the user opens the execution panel or triggers a run, the frontend subscribes
to changes on `execution_logs` filtered by the current `execution_id`:

```typescript
const channel = supabase
  .channel(`execution-${executionId}`)
  .on(
    'postgres_changes',
    {
      event: '*',           // INSERT and UPDATE
      schema: 'public',
      table: 'execution_logs',
      filter: `execution_id=eq.${executionId}`,
    },
    (payload) => {
      // payload.eventType: 'INSERT' | 'UPDATE'
      // payload.new: the new row data
      updateExecutionLog(payload.new)
    }
  )
  .subscribe()
```

When the execution is complete (or the user closes the panel), unsubscribe:

```typescript
supabase.removeChannel(channel)
```

---

## What the frontend does with the data

Each incoming `execution_log` event updates the execution panel UI:

- A row appears for the node with a spinner (status: `'running'`)
- When the update arrives with status `'success'`, the spinner becomes a green checkmark
  and the duration appears
- When the update arrives with status `'error'`, the spinner becomes a red X and the
  error message appears
- The node on the canvas also updates its visual state (border color, status indicator)

---

## The custom hook

All Realtime subscription logic lives in a custom hook:

```typescript
// src/hooks/useExecutionLogs.ts

export function useExecutionLogs(executionId: string | null) {
  const [logs, setLogs] = useState<ExecutionLog[]>([])

  useEffect(() => {
    if (!executionId) return

    // Initial fetch of any existing logs
    supabase
      .from('execution_logs')
      .select('*')
      .eq('execution_id', executionId)
      .then(({ data }) => setLogs(data ?? []))

    // Subscribe to live updates
    const channel = supabase
      .channel(`execution-${executionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'execution_logs',
        filter: `execution_id=eq.${executionId}`,
      }, (payload) => {
        setLogs((prev) => {
          const existing = prev.findIndex(l => l.id === payload.new.id)
          if (existing >= 0) {
            // UPDATE — replace existing log
            const updated = [...prev]
            updated[existing] = payload.new as ExecutionLog
            return updated
          }
          // INSERT — add new log
          return [...prev, payload.new as ExecutionLog]
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [executionId])

  return logs
}
```

---

## Realtime and RLS

Supabase Realtime respects RLS policies. A user will only receive Realtime events
for rows they are allowed to read. Since `execution_logs` has an RLS policy that
filters by ownership through the `executions` → `workflows` → `user_id` chain,
users only receive events for their own workflow executions.

---

## Execution also uses Realtime for the execution record itself

Beyond `execution_logs`, the frontend also subscribes to the `executions` table
to know when the overall run changes from `'running'` to `'success'` or `'error'`.
This drives the top-level status indicator in the UI.
