# 11 — Frontend Architecture

The frontend is a React 18 + TypeScript single-page application built with Vite.
It lives in `apps/web/`.

---

## Pages and routes

| Route | Page file | Description |
|---|---|---|
| `/login` | `pages/Login.tsx` | Email/OAuth login form |
| `/register` | `pages/Register.tsx` | New account registration |
| `/` | `pages/Dashboard.tsx` | Lists all workflows, create/delete actions |
| `/workflow/:id` | `pages/Editor.tsx` | Full canvas workflow editor |
| `/credentials` | `pages/Credentials.tsx` | List, create, delete credentials |
| `/executions` | `pages/Executions.tsx` | Execution history across all workflows |

All routes except `/login` and `/register` are protected — unauthenticated users
are redirected to `/login`.

---

## State management

Two Zustand stores handle all global state.

### `auth.store.ts`

```typescript
{
  user: User | null       // Supabase User object, null if not logged in
  isLoading: boolean      // true while session is being restored on app load
}
```

Used by: protected route wrapper, header (show user avatar), any component that
needs to know who is logged in.

### `workflow.store.ts`

```typescript
{
  nodes: WorkflowNode[]             // nodes currently on the canvas
  connections: WorkflowConnection[] // edges between nodes
  selectedNodeId: string | null     // which node is selected (drives config panel)
  isDirty: boolean                  // true if there are unsaved changes
}
```

Used by: the canvas component (reads and writes nodes/connections), the config panel
(reads selectedNodeId, writes parameters back), the save button (reads isDirty).

**Important:** This store represents the in-memory editor state. It is NOT the
source of truth for saved data — that is Supabase. When a workflow is loaded, the
DB data is written into this store. When saved, this store's data is written back to the DB.

---

## Data fetching (TanStack Query + custom hooks)

All Supabase queries go through custom hooks in `src/hooks/`. Pages and components
never call `supabase.from()` directly.

### Why hooks?

- Keeps pages clean — just call the hook, get the data
- TanStack Query handles caching, loading states, error states, background refetch
- Mutations automatically invalidate related queries so the UI stays fresh
- Easy to test in isolation

### Hook conventions

```typescript
// Queries (reading data)
export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('updated_at', { ascending: false })
      if (error) throw error
      return data as Workflow[]
    }
  })
}

// Mutations (writing data)
export function useCreateWorkflow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: WorkflowInput) => {
      const { data, error } = await supabase
        .from('workflows')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as Workflow
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    }
  })
}
```

### Hooks that exist (or should exist)

| Hook | Purpose |
|---|---|
| `useWorkflows()` | Fetch all workflows for current user |
| `useWorkflow(id)` | Fetch a single workflow by ID |
| `useCreateWorkflow()` | Create a new workflow |
| `useSaveWorkflow()` | Save current editor state to DB |
| `useDeleteWorkflow()` | Delete a workflow |
| `useToggleWorkflow()` | Toggle active/inactive |
| `useExecutions(workflowId)` | Fetch execution history for a workflow |
| `useTriggerExecution()` | Manually trigger a workflow run |
| `useExecutionLogs(executionId)` | Fetch + subscribe to live logs |
| `useCredentials()` | Fetch all credentials |
| `useCreateCredential()` | Create and encrypt a credential |
| `useDeleteCredential()` | Delete a credential |

---

## Component responsibilities

### `components/canvas/`

The React Flow canvas. This component:
- Converts `WorkflowNode[]` from the store into React Flow node objects
- Converts `WorkflowConnection[]` into React Flow edge objects
- Handles `onNodesChange`, `onEdgesChange`, `onConnect` events from React Flow
  and writes the changes back to the Zustand store
- Renders the minimap, zoom controls, and background
- Does NOT contain any node-specific rendering — that is in `components/nodes/`

### `components/nodes/`

Custom React Flow node components. One file per node category or node type.
Each component receives the node's data and renders the visual card:
- Node icon and name at the top
- Input port handles (left side)
- Output port handles (right side)
- Status indicator during execution (idle / running / success / error)

### `components/sidebar/`

Two panels:

**Node palette** (shown when no node is selected) — lists all node types from
`nodeRegistry` grouped by category. Drag a node from here to the canvas to add it.

**Config panel** (shown when a node is selected) — renders a dynamic form based on
the selected node's `parameters` array from `@workflow/node-definitions`. Each
parameter type renders a different form field:
- `string` → `<input type="text">`
- `number` → `<input type="number">`
- `boolean` → `<Switch />`
- `json` → textarea with JSON validation
- `code` → Monaco editor
- `options` → `<Select />`
- `credential` → credential picker dropdown

On change, writes back to `workflow.store.updateNodeParameters()`.

### `components/execution/`

A slide-over panel or bottom drawer that shows the execution in progress.

- Triggered by clicking "Run" or when a run starts
- Subscribes to live `execution_logs` via `useExecutionLogs(executionId)`
- Shows each node as a row with status icon, duration, and expandable input/output data

### `components/ui/`

Base reusable components following the shadcn/ui pattern. These are styled with
Tailwind and built on Radix UI primitives. Examples:
- `Button`
- `Input`
- `Dialog`
- `Badge`
- `Select`
- `Tooltip`
- `DropdownMenu`
- `Spinner`

---

## The `cn()` utility

Located in `src/lib/utils.ts`. Used everywhere for conditional Tailwind class composition:

```typescript
import { cn } from '@/lib/utils'

<div className={cn(
  'base-class another-class',
  isActive && 'active-class',
  variant === 'danger' && 'text-red-500'
)} />
```

---

## Path alias

The `@/` alias maps to `src/`. So instead of `../../lib/utils` you write `@/lib/utils`.
Configured in both `vite.config.ts` and `tsconfig.app.json`.
