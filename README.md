# AutoFlow — Visual Workflow Automation

AutoFlow is a powerful, self-hosted visual workflow automation platform. It allows users to build complex automated processes by connecting functional blocks (nodes) on a drag-and-drop canvas.

Think of it as a developer-centric, self-hosted alternative to platforms like n8n or Zapier, designed to run on a modern stack with Supabase and React.

---

## 🚀 Key Features

- **Visual Canvas Editor**: Build workflows by dragging and connecting nodes using a high-performance React Flow canvas.
- **Multiple Trigger Types**:
  - **Manual**: Trigger runs directly from the UI.
  - **Webhook**: Receive data from external services via HTTP endpoints.
  - **Schedule (Cron)**: Run recurring tasks at specific intervals (minutes, hours, days).
- **Extensible Node Library**:
  - **Integrations**: Slack, GitHub, OpenAI, Google Gemini, Anthropic.
  - **Logic**: If/Else, Switch/Case, Merge, Wait, Code (JavaScript).
  - **Utility**: HTTP Request, Set Variables, Edit Fields.
- **Real-time Monitoring**: Watch nodes "light up" in the editor as they execute, with live streaming logs via Supabase Realtime.
- **Secure Credential Management**: Store API keys, OAuth tokens, and secrets with AES-256 encryption at rest.
- **Detailed Execution History**: Full audit trail of every run, including input/output data and duration for every node.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript (Strict Mode)
- **Editor**: React Flow (`@xyflow/react`) for the node-based canvas
- **State**: Zustand + Immer for lightweight, immutable state management
- **Data Fetching**: TanStack Query (React Query)
- **Styling**: Tailwind CSS + Radix UI primitives
- **Editor**: Monaco Editor for the custom `Code` node configurations

### Backend (Supabase)
- **Database**: PostgreSQL 15 with RLS (Row Level Security)
- **Logic**: Supabase Edge Functions (Deno runtime)
- **Auth**: Supabase Auth (Email/Password & OAuth)
- **Realtime**: WebSocket-based pub/sub for execution streaming
- **Storage**: Supabase Storage for file artifacts and exports
- **Scheduling**: `pg_cron` for managing scheduled workflow triggers

---

## 📂 Project Structure

This is a monorepo managed with `pnpm`:

- `apps/web/`: The React frontend application.
- `packages/types/`: Shared TypeScript interfaces used by both frontend and backend.
- `packages/validators/`: Shared Zod schemas for data validation.
- `packages/node-definitions/`: Metadata and configuration for all workflow nodes.
- `supabase/functions/`: Deno-based Edge Functions (orchestrator, executors, webhooks).
- `supabase/migrations/`: Database schema, RLS policies, and helper functions.

---

## 📚 Documentation Map

For detailed technical guides, please refer to the files in the `docs/` folder:

| File | What it covers |
|---|---|
| [01-project-overview.md](docs/01-project-overview.md) | High-level concepts and user goals |
| [02-tech-stack.md](docs/02-tech-stack.md) | Deep dive into libraries and tools |
| [03-monorepo-structure.md](docs/03-monorepo-structure.md) | Folder layout and dependency management |
| [04-shared-packages.md](docs/04-shared-packages.md) | Types, validators, and node definitions |
| [05-database-schema.md](docs/05-database-schema.md) | Tables, RLS, and Postgres functions |
| [07-workflow-engine.md](docs/07-workflow-engine.md) | The node-by-node execution logic |
| [08-node-system.md](docs/08-node-system.md) | How nodes are defined and executed |
| [09-credential-management.md](docs/09-credential-management.md) | Encryption and secret handling |
| [12-edge-functions.md](docs/12-edge-functions.md) | Orchestration and webhook receivers |
| [15-local-development.md](docs/15-local-development.md) | **Setup and run instructions** |

---

## 🤖 For AI Assistants

1. Read all files in the `docs/` folder before making changes.
2. Never use `any` in TypeScript.
3. Import shared types from `@workflow/types` and schemas from `@workflow/validators`.
4. RLS is enabled on every table — always filter by `user_id`.
5. Edge Functions must use Deno-compatible imports.

