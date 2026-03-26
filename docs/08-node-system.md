# 08 — Node System

Every automation step in a workflow is a node. The node system has two separate parts
that must stay in sync: the definition (what the node looks like and needs) and the
executor (what the node actually does when it runs).

---

## Part 1: Node Definition (`@workflow/node-definitions`)

A definition is a plain TypeScript object of type `NodeDefinition`. It describes
everything the frontend and backend need to know about a node type — but it contains
no runtime logic.

```typescript
const httpRequestNode: NodeDefinition = {
  type: 'http-request',          // unique string key — must match executor key
  name: 'HTTP Request',          // display name in the UI
  description: 'Make HTTP requests to any URL',
  category: 'action',            // 'trigger' | 'action' | 'logic' | 'transform'
  icon: 'globe',                 // lucide-react icon name
  version: 1,
  inputs: [
    { name: 'main', label: 'Input', type: 'main' }
  ],
  outputs: [
    { name: 'main', label: 'Output', type: 'main' },
    { name: 'error', label: 'Error', type: 'error' }
  ],
  parameters: [
    {
      name: 'method',
      label: 'Method',
      type: 'options',
      required: true,
      default: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
      ]
    },
    { name: 'url', label: 'URL', type: 'string', required: true },
    { name: 'headers', label: 'Headers', type: 'json', required: false },
    { name: 'body', label: 'Body', type: 'json', required: false },
  ]
}
```

### Parameter types

| Type | UI rendered | Description |
|---|---|---|
| `string` | Text input | Single line text |
| `number` | Number input | Numeric value |
| `boolean` | Toggle | True/false switch |
| `json` | JSON editor | Multi-line JSON |
| `code` | Monaco editor | Full code editor with syntax highlighting |
| `options` | Select dropdown | Requires `options` array |
| `credential` | Credential picker | Dropdown of saved credentials filtered by type |

---

## Part 2: Node Executor (`supabase/functions/execute-node/nodes/`)

An executor is a TypeScript function that runs on Deno. It receives data and
parameters, does the actual work (HTTP call, DB query, transform, etc.),
and returns the result.

```typescript
// supabase/functions/execute-node/nodes/http-request.ts

import type { NodeData } from '../types.ts'

interface HttpRequestParams {
  method: string
  url: string
  headers?: Record<string, string>
  body?: unknown
}

export async function executeHttpRequest(
  params: HttpRequestParams,
  inputData: NodeData,
  _credentials?: Record<string, unknown>
): Promise<NodeData> {
  const response = await fetch(params.url, {
    method: params.method,
    headers: {
      'Content-Type': 'application/json',
      ...params.headers,
    },
    body: params.body ? JSON.stringify(params.body) : undefined,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const data = await response.json()

  return [{ json: data }]
}
```

### Executor contract

Every executor must:
- Accept `(params, inputData, credentials?)` as arguments
- Return `Promise<NodeData>` on success
- Throw an `Error` on failure (the engine catches this and marks the node as error)
- Never mutate `inputData` directly
- Never store credentials anywhere — use them in memory and let them be garbage collected

---

## Part 3: The Dispatcher (`execute-node/index.ts`)

The main `execute-node` function receives a `node_type` string and dispatches to
the correct executor:

```typescript
import { executeHttpRequest } from './nodes/http-request.ts'
import { executeIf } from './nodes/if.ts'
import { executeSet } from './nodes/set.ts'
import { executeCode } from './nodes/code.ts'

const executors: Record<string, Function> = {
  'http-request': executeHttpRequest,
  'if': executeIf,
  'set': executeSet,
  'code': executeCode,
}

// In the handler:
const executor = executors[node_type]
if (!executor) throw new Error(`Unknown node type: ${node_type}`)
const output = await executor(parameters, inputData, credentials)
```

---

## Current node types

### `webhook-trigger` (trigger)
No executor needed — the trigger data from the webhook POST becomes the initial
input data for the first connected node.

### `cron-trigger` (trigger)
No executor needed — the trigger fires on schedule and passes an empty item
as initial data.

### `http-request` (action)
Makes an HTTP request. Supports GET, POST, PUT, PATCH, DELETE. Headers and body
can reference input data using expressions. Returns the response body as JSON.

### `if` (logic)
Evaluates a JavaScript expression against the input data. Returns data on the
`true` output if the expression is truthy, `false` output otherwise.
Example condition: `$item.json.status === 'active'`

### `set` (transform)
Sets, adds, or removes fields on each input item. Configured as a JSON map of
field name → value (can use expressions to reference input fields).

### `code` (transform)
Runs user-supplied JavaScript. The user writes a function body that has access to:
- `$input.all()` — returns all input items
- `$input.first()` — returns the first item
- `$input.item` — the current item in a loop
Must return an array of items.

---

## How to add a new node type

### Step 1 — Create the definition

```bash
touch packages/node-definitions/src/definitions/send-email.ts
```

Write the `NodeDefinition` object following the pattern above.

### Step 2 — Register it

In `packages/node-definitions/src/registry.ts`:
```typescript
import { sendEmailNode } from './definitions/send-email'

export const nodeRegistry = {
  // ...existing nodes
  'send-email': sendEmailNode,
}
```

Export it from `packages/node-definitions/src/index.ts`:
```typescript
export * from './definitions/send-email'
```

### Step 3 — Create the executor

```bash
touch supabase/functions/execute-node/nodes/send-email.ts
```

Write the async executor function following the contract above.

### Step 4 — Register the executor

In `supabase/functions/execute-node/index.ts`, add to the dispatcher map:
```typescript
import { executeSendEmail } from './nodes/send-email.ts'

const executors = {
  // ...existing executors
  'send-email': executeSendEmail,
}
```

### Step 5 — Done

The frontend will automatically show the new node in the palette (it reads from
`nodeRegistry`) and render the correct config form (it reads the `parameters` array).
