# 04 — Shared Packages

There are three shared packages. They live in `packages/` and can be imported by both
the frontend (`apps/web`) and the Supabase Edge Functions. They are the single source
of truth for data shapes, validation rules, and node metadata.

---

## `@workflow/types`

**Location:** `packages/types/`
**Purpose:** TypeScript interfaces and types shared across the entire project.

If a data shape changes, it changes here. Everything else picks it up automatically.

### Exports

#### From `workflow.ts`

```typescript
Workflow {
  id: string
  name: string
  description?: string
  active: boolean
  nodes: WorkflowNode[]
  connections: WorkflowConnection[]
  settings: WorkflowSettings
  created_at: string
  updated_at: string
  user_id: string
  workspace_id: string
}

WorkflowNode {
  id: string
  type: string           // matches a key in nodeRegistry
  name: string
  position: { x: number; y: number }
  parameters: Record<string, unknown>
  credential_id?: string
}

WorkflowConnection {
  source_node_id: string
  source_output: string  // name of the output port e.g. 'main', 'true', 'false'
  target_node_id: string
  target_input: string   // name of the input port e.g. 'main'
}

WorkflowSettings {
  timezone: string
  error_workflow_id?: string
  save_execution_progress: boolean
  max_retries: number
}
```

#### From `execution.ts`

```typescript
ExecutionStatus = 'pending' | 'running' | 'success' | 'error' | 'cancelled'

Execution {
  id: string
  workflow_id: string
  status: ExecutionStatus
  triggered_by: 'manual' | 'webhook' | 'cron'
  started_at: string
  finished_at?: string
  error?: string
}

ExecutionLog {
  id: string
  execution_id: string
  node_id: string
  node_name: string
  status: ExecutionStatus
  input_data: unknown
  output_data: unknown
  error?: string
  started_at: string
  finished_at?: string
  duration_ms?: number
}
```

#### From `credential.ts`

```typescript
CredentialType = 'http' | 'oauth2' | 'apiKey' | 'basic' | 'postgres' | 'smtp'

Credential {
  id: string
  name: string
  type: CredentialType
  user_id: string
  workspace_id: string
  created_at: string
  updated_at: string
}
// Note: Credential never includes the actual secret data — only metadata.
// Raw data is only ever in memory during execution.
```

#### From `node.ts`

```typescript
NodeCategory = 'trigger' | 'action' | 'logic' | 'transform'

NodeDefinition {
  type: string           // unique identifier e.g. 'http-request'
  name: string           // display name e.g. 'HTTP Request'
  description: string
  category: NodeCategory
  icon: string           // lucide-react icon name
  version: number
  inputs: NodePort[]
  outputs: NodePort[]
  parameters: NodeParameter[]
  credential_type?: string
}

NodePort {
  name: string           // internal identifier e.g. 'main', 'true', 'error'
  label: string          // display label
  type: 'main' | 'error'
}

NodeParameter {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'json' | 'code' | 'options' | 'credential'
  required: boolean
  default?: unknown
  options?: { label: string; value: string }[]  // only for type: 'options'
  description?: string
}
```

---

## `@workflow/validators`

**Location:** `packages/validators/`
**Purpose:** Zod schemas for runtime validation. Used on form submit in the frontend and
on request body validation in edge functions.

Depends on `@workflow/types`.

### Exports

#### From `workflow.schema.ts`

```typescript
WorkflowNodeSchema     // validates a WorkflowNode object
WorkflowConnectionSchema  // validates a WorkflowConnection object
WorkflowSchema         // validates a full workflow payload (name, nodes, connections, settings)
WorkflowInput          // TypeScript type inferred from WorkflowSchema
```

#### From `credential.schema.ts`

```typescript
CredentialSchema       // validates name, type, and data (key-value map of the secret fields)
CredentialInput        // inferred type
```

#### From `execution.schema.ts`

```typescript
TriggerExecutionSchema  // validates { workflow_id, trigger_data? }
TriggerExecutionInput   // inferred type
```

### Usage example

```typescript
import { WorkflowSchema } from '@workflow/validators'

const result = WorkflowSchema.safeParse(formData)
if (!result.success) {
  console.error(result.error.flatten())
}
```

---

## `@workflow/node-definitions`

**Location:** `packages/node-definitions/`
**Purpose:** The registry of all node types. Defines what every node looks like, what
it needs configured, and what ports it exposes.

Depends on `@workflow/types`.

### Exports

#### `nodeRegistry`

A `Record<string, NodeDefinition>` object containing all registered node types.

```typescript
import { nodeRegistry } from '@workflow/node-definitions'

// Keys: 'http-request', 'webhook-trigger', 'cron-trigger', 'if', 'set', 'code'
console.log(Object.keys(nodeRegistry))
```

#### `getNodeDefinition(type: string)`

Helper function to look up a node definition by its type string. Returns
`NodeDefinition | undefined`.

```typescript
import { getNodeDefinition } from '@workflow/node-definitions'

const def = getNodeDefinition('http-request')
// def.name === 'HTTP Request'
// def.parameters === [{ name: 'method', ... }, { name: 'url', ... }, ...]
```

### Current node types

| Type | Category | Inputs | Outputs |
|---|---|---|---|
| `http-request` | action | main | main, error |
| `webhook-trigger` | trigger | none | main |
| `cron-trigger` | trigger | none | main |
| `if` | logic | main | true, false |
| `set` | transform | main | main |
| `code` | transform | main | main, error |

### How the frontend uses this

The node palette sidebar iterates over `nodeRegistry` grouped by category to show
all available nodes. When a user drops a node onto the canvas, the definition tells
the canvas what ports to render. When the user selects a node, the definition's
`parameters` array drives the dynamic config form.

### How the backend uses this

The `execute-node` edge function uses `getNodeDefinition` to validate that a node
type exists before dispatching to its executor.

### Adding a new node type

1. Create `packages/node-definitions/src/definitions/your-node.ts`
2. Export the definition from `packages/node-definitions/src/index.ts`
3. Add it to `nodeRegistry` in `packages/node-definitions/src/registry.ts`
4. Create the executor at `supabase/functions/execute-node/nodes/your-node.ts`
5. Register the executor in the dispatcher inside `execute-node/index.ts`

See `08-node-system.md` for the full guide.
