# 08 — Node System

Every automation step in a workflow is a node. The node system has two separate parts
that must stay in sync:

1. **Node Definition** — what the node looks like and how it is configured
2. **Node Executor** — what the node does at runtime inside the workflow engine

---

## Part 1: Node Definition (`@workflow/node-definitions`)

A definition is a plain TypeScript object of type `NodeDefinition`. It includes display
metadata and the parameter schema used by the editor and runtime.

```Workflow Automation/packages/types/src/node.ts#L1-27
export type NodeCategory = 'trigger' | 'action' | 'logic' | 'transform'

export interface NodeDefinition {
  type: string
  name: string
  description: string
  category: NodeCategory
  icon: string
  version: number
  inputs: NodePort[]
  outputs: NodePort[]
  parameters: NodeParameter[]
  credential_type?: string
}
```

### Parameter types

| Type | UI rendered | Description |
|---|---|---|
| `string` | Text input | Single-line text |
| `number` | Number input | Numeric value |
| `boolean` | Toggle | True/false |
| `json` | JSON editor | Object/array config |
| `code` | Code editor | JavaScript code block |
| `options` | Select dropdown | Requires `options` values |
| `credential` | Credential picker | Select stored credentials |

---

## Part 2: Node Executor (`supabase/functions/execute-node/nodes/`)

Executors run in the Edge runtime and receive canonical workflow data.

### Canonical runtime data contract

All nodes now process a unified item-array format (`NodeData`):

```Workflow Automation/supabase/functions/execute-node/types.ts#L7-28
export interface NodeDataItem {
  json: Record<string, unknown>;
  binary?: Record<
    string,
    {
      data: string;
      mimeType?: string;
      fileName?: string;
    }
  >;
}

export type NodeData = NodeDataItem[];

export interface NodeResult {
  output: NodeData;
  error?: string;
  branch?: string;
}
```

This contract is enforced in the dispatcher before and after execution.

---

## Part 3: Dispatcher (`execute-node/index.ts`)

`execute-node` routes by `node_type` to the matching executor and returns normalized output.

Supported runtime handlers include:

- `http-request`
- `if`
- `set`
- `code`
- `switch`
- `merge`
- `function-item`
- `edit-fields`
- trigger passthrough (`webhook-trigger`, `cron-trigger`)

---

## Current node types

## Triggers
- `webhook-trigger`
- `cron-trigger`

## Core action/logic/transform
- `http-request`
- `if`
- `set`
- `code`
- `switch`
- `merge`
- `function-item` (legacy compatibility)
- `edit-fields`

---

## New node: Function Item (legacy)

### Definition
- **Type:** `function-item`
- **Category:** `transform`
- **Inputs:** `main`
- **Outputs:** `main`, `error`
- **Parameter:** `code` (`code` editor)

### Runtime behavior
- Executes user JavaScript **once per input item**
- Exposes item-level helpers:
  - `$json`
  - `$binary`
  - `$itemIndex`
  - `$input`
  - `$credentials`
- Return value handling:
  - plain object → becomes new `json`
  - `{ json, binary? }` → treated as full item
  - `null`/`undefined` → passthrough original item
  - scalar → wrapped as `{ value: scalar }`

This preserves legacy Function Item semantics while using the canonical runtime contract.

---

## New node: Edit Fields

### Definition
- **Type:** `edit-fields`
- **Category:** `transform`
- **Inputs:** `main`
- **Outputs:** `main`
- **Modes:** `manual`, `keepOnly`, `remove`
- **Parameters:** `set`, `rename`, `keep`, `remove`, `strict`

### Runtime behavior
Current backend executor supports structured field operations over each item’s `json`:

- `set` — set/overwrite fields
- `keep` — keep only selected fields
- `remove` — remove selected fields
- `rename` — rename keys by map

Input/output remains `NodeData`, and binary payload is preserved.

---

## Switch node notes

`switch` routes to named branches (`case-1`, `case-2`, `case-3`, `default`) based on
ordered case evaluation against the configured field.

---

## Merge node notes

`merge` supports:

- `append` — concatenate streams/items
- `index` — merge items by index (`keepUnpaired` supported)

---

## Adding a new node type (checklist)

1. Add definition under `packages/node-definitions/src/definitions/`
2. Register in `packages/node-definitions/src/registry.ts`
3. Export in `packages/node-definitions/src/index.ts`
4. Add executor under `supabase/functions/execute-node/nodes/`
5. Register in `supabase/functions/execute-node/index.ts`
6. Ensure input/output follows canonical `NodeData` contract

---

## Important implementation rules

- Keep definition and executor parameter contracts aligned
- Executors should return `NodeResult` (never raw untyped payloads)
- Do not log plaintext credential secrets
- Throw or return structured errors so workflow logs can capture failures cleanly
- Preserve binary data whenever a node transforms `json` only