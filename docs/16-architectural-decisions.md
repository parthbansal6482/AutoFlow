# 16 — Architectural Decisions

This document explains the key technical choices made in this project and the reasoning
behind them. Read this before suggesting architectural changes.

---

## Why Supabase instead of a custom Express/Fastify backend?

Building a custom backend would require:
- A web server (Express, Fastify, Hono)
- Auth (Passport, JWT library, session management)
- WebSocket server for realtime
- File storage
- Database ORM and migration system
- Deployment and scaling infrastructure

Supabase provides all of this out of the box. The tradeoff is less control over
the infrastructure. For a workflow automation tool, the value of moving fast and
focusing on workflow engine logic far outweighs the loss of control over the auth
system or WebSocket server.

---

## Why store workflow nodes and connections as JSONB instead of relational tables?

**Option considered:** A `nodes` table and a `connections` table with foreign keys.

**Why JSONB was chosen:**
- Node types have wildly different parameter shapes. An HTTP Request node has `url`,
  `method`, `headers`, `body`. A Send Email node has `to`, `subject`, `body`, `template`.
  Storing this relationally would require either a massive nullable table or an EAV
  (entity-attribute-value) pattern — both are painful to query and maintain.
- Adding a new node type with new parameters requires zero schema changes when using JSONB.
- The entire workflow can be fetched in a single query.
- The frontend and engine already work with the workflow as a single JSON object.

**The tradeoff:** You cannot do relational queries on individual node parameters.
But that's fine — we never need to query "all workflows with an HTTP Request node
pointing to api.example.com". If we ever did, we could add a generated column or index.

---

## Why a monorepo with pnpm workspaces?

**The problem it solves:** The frontend (React, runs in browser) and the backend
(Edge Functions, runs on Deno) need to share TypeScript types and validation schemas.
Without a monorepo, you'd either duplicate the types or publish them to npm.

**Why pnpm specifically:**
- Faster installs than npm
- Disk-efficient (symlinks instead of copying)
- First-class workspace support
- Strict by default (won't let you import packages not in your own package.json)

---

## Why Zustand instead of Redux or React Context?

**Redux** has too much boilerplate for the value it provides here. Actions, reducers,
selectors, middleware — the workflow editor state is complex but not complex enough
to justify the Redux mental model.

**React Context** re-renders every consumer on every state change. The canvas has
hundreds of nodes and edges — a context update would re-render everything constantly.

**Zustand** with Immer gives:
- Minimal boilerplate
- Selective subscriptions (components only re-render when the slice they care about changes)
- Mutable-style writes with immutable semantics via Immer
- No Provider wrapping needed
- Easy to use outside of React (in hooks, utilities)

---

## Why TanStack Query alongside Zustand?

Zustand manages **local UI state** — what's on the canvas right now, which node
is selected, whether there are unsaved changes. This state is ephemeral and lives
only in the browser tab.

TanStack Query manages **server state** — the list of workflows from the DB, execution
history, credentials. This state comes from the server, needs caching, and can become
stale. TanStack Query handles all of: loading states, error states, background refetch,
cache invalidation after mutations, and deduplication of concurrent requests.

Mixing these two concerns in one store leads to complexity. Keeping them separate
makes each responsibility clear.

---

## Why encrypt credentials in Edge Functions and not in the frontend?

If encryption happened in the frontend:
- The encryption key would have to be shipped to the browser (it's in the JS bundle
  or fetched from an API)
- Any user who opens DevTools can extract the key
- The key would be exposed in network requests

Edge Functions run server-side. The encryption key lives only in Supabase's secret
management system, never in any file that's bundled or served to clients.
This is the only way to have meaningful encryption.

---

## Why Supabase Realtime instead of polling for execution logs?

**Polling at 1s interval:**
- Every user watching an execution sends a DB query every second
- 100 concurrent users = 100 queries/second just for log updates
- Adds latency (worst case = 1 second behind)

**Supabase Realtime:**
- One persistent WebSocket connection per browser tab
- Updates pushed the instant a row changes (Postgres → replication → WebSocket → browser)
- No extra DB queries from the frontend
- Scales much better

The only downside: Realtime has a connection limit depending on your Supabase plan.
For high scale, you'd replace it with a dedicated WebSocket service (Ably, Pusher).
For this project's scale, Supabase Realtime is the right choice.

---

## Why pg_cron for scheduling instead of an external queue?

**External queue options:** Inngest, BullMQ (needs Redis), AWS SQS, etc.

**Why pg_cron was chosen for the default:**
- Zero additional services or accounts needed
- Runs inside Postgres — same infra already in use
- No additional cost
- Simple SQL interface
- `pg_net` handles the HTTP call to the Edge Function

**The tradeoffs:**
- Minimum 1-minute granularity (can't schedule every 30 seconds)
- Limited monitoring (no built-in job dashboard)
- If the Postgres instance is down when a job fires, the job is missed

For production use cases that need sub-minute scheduling, retry guarantees, or a
monitoring dashboard — Inngest is the recommended upgrade path.

---

## Why React Flow for the canvas?

Building a node-based canvas editor from scratch would take months:
- SVG/Canvas rendering of nodes and edges
- Hit testing for clicks and hovers
- Drag-and-drop with snapping
- Edge routing (curved/straight/stepped)
- Zoom and pan with minimap
- Port connection logic
- Undo/redo

React Flow provides all of this and is the industry standard for this use case
(used by n8n itself, Retool, and many others). The API surface is well-designed and
lets us build fully custom node components on top of it.

---

## Why Monaco Editor for code nodes?

Monaco is the editor engine powering VS Code. For a Code node where users write
JavaScript, a plain `<textarea>` would be a poor developer experience.
Monaco gives syntax highlighting, bracket matching, autocomplete, and error indicators
with a single import. The bundle size cost (~2MB) is justified for a developer-focused tool.
