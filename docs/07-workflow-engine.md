# 07 — Workflow Engine

The workflow engine is the core of the product. It is responsible for taking a workflow
definition (a graph of nodes) and executing it — running each node in the correct order,
passing data between nodes, and handling errors.

The engine runs inside Supabase Edge Functions.

---

## Execution flow (step by step)

```
1. A trigger fires (manual click / webhook POST / pg_cron schedule)
          ↓
2. execute-workflow Edge Function is called
   - Receives: { workflow_id, trigger_data }
   - Fetches the workflow from the database
   - Validates the workflow is active
   - Creates an execution record with status 'running'
          ↓
3. Engine finds the trigger node
   - Looks through workflow.nodes for a node with category 'trigger'
   - This is the starting point
          ↓
4. Engine walks the graph
   For each node in topological order:
     a. Insert an execution_log row with status 'running'
     b. Fetch any credentials the node needs (decrypted in memory)
     c. Call execute-node with { nodeType, parameters, credentials, inputData }
     d. Receive { outputData } or { error }
     e. Update the execution_log with output, status, duration_ms
     f. If error and no error branch: mark execution as 'error' and stop
     g. Find the next node(s) via the connections array
     h. Pass outputData as inputData to the next node
          ↓
5. When all nodes complete:
   - Update execution record with status 'success' and finished_at
          ↓
6. Supabase Realtime pushes each execution_log update to the frontend live
```

---

## The node graph

Workflows are stored as two arrays in the database:

**`nodes`** — an array of `WorkflowNode` objects:
```json
[
  { "id": "node-1", "type": "webhook-trigger", "name": "On webhook", "position": {...}, "parameters": {} },
  { "id": "node-2", "type": "http-request", "name": "Fetch data", "position": {...}, "parameters": { "method": "GET", "url": "https://api.example.com/data" } },
  { "id": "node-3", "type": "set", "name": "Format output", "position": {...}, "parameters": { "fields": {} } }
]
```

**`connections`** — an array of `WorkflowConnection` objects:
```json
[
  { "source_node_id": "node-1", "source_output": "main", "target_node_id": "node-2", "target_input": "main" },
  { "source_node_id": "node-2", "source_output": "main", "target_node_id": "node-3", "target_input": "main" }
]
```

The engine traverses this graph by:
1. Starting at the trigger node
2. Looking up which connections have `source_node_id` matching the current node
3. Finding the target nodes from those connections
4. Running each target node with the current node's output as its input

---

## Branching (IF nodes)

IF nodes have two output ports: `true` and `false`. The engine evaluates the
condition and follows only the matching branch.

```
Connections:
  { source_node_id: "if-node", source_output: "true",  target_node_id: "send-email" }
  { source_node_id: "if-node", source_output: "false", target_node_id: "log-node"   }

At runtime, if the condition evaluates to true:
  - "send-email" is executed
  - "log-node" is NOT executed
```

---

## Data format between nodes

Every node receives and returns data in the same format — an array of items:

```typescript
type NodeData = Array<{
  json: Record<string, unknown>  // the actual data payload
  binary?: Record<string, {      // optional binary/file data
    data: string                 // base64 encoded
    mimeType: string
    fileName: string
  }>
}>
```

Inside a Code node, the user accesses this via `$input.all()` which returns the
full array, or `$input.first()` for the first item.

---

## Error handling

Each node has an optional `error` output port. If a node fails:

- If there is a connection from the node's `error` port → follow that branch
- If there is no error connection → mark the whole execution as `error` and stop

The `settings.max_retries` on a workflow controls how many times a failed execution
is retried from the beginning.

---

## Parallel execution

Currently nodes execute sequentially. When an IF node or Switch node splits
into multiple branches that later merge, the engine runs each branch in sequence
before the merge node. True parallel execution (using `Promise.all`) is a future
enhancement.

---

## execute-workflow Edge Function

**File:** `supabase/functions/execute-workflow/index.ts`
**Triggered by:** Manual trigger from frontend, webhook-receiver, or pg_cron via pg_net

Input:
```typescript
{
  workflow_id: string
  trigger_data?: Record<string, unknown>
}
```

Output:
```typescript
{
  execution_id: string
}
```

---

## execute-node Edge Function

**File:** `supabase/functions/execute-node/index.ts`
**Triggered by:** execute-workflow (internal call only, not public)

Input:
```typescript
{
  node_type: string
  parameters: Record<string, unknown>
  credentials?: Record<string, unknown>  // decrypted, in memory only
  input_data: NodeData
}
```

Output:
```typescript
{
  output_data: NodeData
}
// or throws on error
```

The function dispatches to the correct handler file in `execute-node/nodes/` based
on `node_type`.
