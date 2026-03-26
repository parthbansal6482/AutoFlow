# 03 — Monorepo Structure

## What is a monorepo?

A monorepo is a single git repository that contains multiple related projects. Instead of
having separate repos for the frontend, backend, and shared code, everything lives together.
This makes it easy to share code between packages without publishing to npm or dealing with
version mismatches.

pnpm workspaces handles the linking between packages — when `apps/web` imports
`@workflow/types`, pnpm points it directly to `packages/types/src` on disk.

---

## Full folder structure

```
Workflow Automation/
│
├── apps/
│   └── web/                          # The React frontend application
│       ├── public/                   # Static assets served as-is
│       ├── src/
│       │   ├── components/
│       │   │   ├── canvas/           # React Flow canvas, custom edges, controls, minimap
│       │   │   ├── nodes/            # Visual node card components rendered on the canvas
│       │   │   ├── sidebar/          # Node palette (left) + node config panel (right)
│       │   │   ├── execution/        # Live execution log drawer/panel
│       │   │   └── ui/               # Base reusable UI: Button, Input, Dialog, Badge, etc.
│       │   ├── pages/                # One file per route
│       │   │   ├── Login.tsx
│       │   │   ├── Register.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Editor.tsx
│       │   │   ├── Credentials.tsx
│       │   │   └── Executions.tsx
│       │   ├── hooks/                # Custom React hooks wrapping Supabase + TanStack Query
│       │   ├── store/                # Zustand global stores
│       │   │   ├── workflow.store.ts # Canvas state: nodes, connections, selected node
│       │   │   └── auth.store.ts     # Auth state: current user, loading
│       │   ├── lib/                  # Initialized clients and pure utility functions
│       │   │   ├── supabase.ts       # Supabase client instance
│       │   │   ├── query-client.ts   # TanStack Query client instance
│       │   │   └── utils.ts          # cn() and other pure helpers
│       │   ├── styles/               # Any global styles beyond index.css
│       │   ├── App.tsx               # Root component with React Router routes
│       │   ├── main.tsx              # Entry point — mounts React, wraps providers
│       │   └── index.css             # Tailwind directives + CSS variable theme tokens
│       ├── .env.local                # Local environment variables (gitignored)
│       ├── index.html                # Vite HTML entry
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── types/                        # @workflow/types
│   │   └── src/
│   │       ├── index.ts              # Re-exports everything
│   │       ├── workflow.ts           # Workflow, WorkflowNode, WorkflowConnection, WorkflowSettings
│   │       ├── node.ts               # NodeDefinition, NodePort, NodeParameter, NodeCategory
│   │       ├── execution.ts          # Execution, ExecutionLog, ExecutionStatus
│   │       └── credential.ts         # Credential, CredentialType
│   │
│   ├── validators/                   # @workflow/validators
│   │   └── src/
│   │       ├── index.ts
│   │       ├── workflow.schema.ts    # WorkflowSchema, WorkflowNodeSchema, etc.
│   │       ├── credential.schema.ts  # CredentialSchema
│   │       └── execution.schema.ts   # TriggerExecutionSchema
│   │
│   └── node-definitions/             # @workflow/node-definitions
│       └── src/
│           ├── index.ts
│           ├── registry.ts           # nodeRegistry map + getNodeDefinition()
│           └── definitions/          # One file per node type
│               ├── http-request.ts
│               ├── webhook-trigger.ts
│               ├── cron-trigger.ts
│               ├── if.ts
│               ├── set.ts
│               └── code.ts
│
├── supabase/
│   ├── config.toml                   # Supabase local dev configuration
│   ├── functions/                    # Edge Functions (Deno + TypeScript)
│   │   ├── execute-workflow/
│   │   │   └── index.ts
│   │   ├── execute-node/
│   │   │   ├── index.ts
│   │   │   └── nodes/               # One executor file per node type
│   │   │       ├── http-request.ts
│   │   │       ├── if.ts
│   │   │       ├── set.ts
│   │   │       └── code.ts
│   │   ├── webhook-receiver/
│   │   │   └── index.ts
│   │   ├── encrypt-credential/
│   │   │   └── index.ts
│   │   ├── decrypt-credential/
│   │   │   └── index.ts
│   │   └── oauth-callback/
│   │       └── index.ts
│   ├── migrations/                   # SQL files run in order to build the DB schema
│   │   └── 0001_initial_schema.sql
│   ├── schemas/                      # Human-readable schema reference files
│   └── seed/                         # SQL seed data for local development
│
├── docs/                             # This documentation folder
├── .gitignore
├── package.json                      # Root package.json with workspace scripts
├── pnpm-workspace.yaml               # Tells pnpm where the workspace packages are
└── tsconfig.base.json                # Shared TypeScript config extended by all packages
```

---

## Key rules about the structure

- Never put application logic directly in `lib/` — that folder is for initialized clients
  and pure utilities only. Logic goes in `hooks/` (data fetching) or `store/` (state).
- Never import from `apps/web` inside `packages/` — packages must not depend on the app.
- Never import from `supabase/functions/` in the frontend — edge functions are server-side only.
- The `packages/` directory is the only place shared code lives. If you find yourself
  duplicating a type or function across the app and an edge function, it belongs in a package.
- Each edge function folder is self-contained — it has its own `index.ts` entry point and
  can have sub-files (like `nodes/` inside `execute-node/`).

---

## How pnpm workspaces linking works

`pnpm-workspace.yaml` declares which folders are packages:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'supabase/functions/*'
```

When you run `pnpm install` at the root, pnpm reads every `package.json` in those
locations and links them together. So when `apps/web/package.json` lists
`"@workflow/types": "workspace:*"` as a dependency, pnpm creates a symlink pointing
directly to `packages/types/`. No publishing required.
