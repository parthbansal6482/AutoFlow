# Workflow Automation — Documentation

This folder contains the full technical documentation for the Workflow Automation project.
Read these files in order if you are new to the project. If you are an AI assistant helping
with this project, read all files in this folder before making any changes.

---

## Files in this folder

| File | What it covers |
|---|---|
| [01-project-overview.md](docs/01-project-overview.md) | What the product is, goals, and high-level concepts |
| [02-tech-stack.md](docs/02-tech-stack.md) | Every library and tool used and why |
| [03-monorepo-structure.md](docs/03-monorepo-structure.md) | Full folder structure with explanations |
| [04-shared-packages.md](docs/04-shared-packages.md) | @workflow/types, @workflow/validators, @workflow/node-definitions |
| [05-database-schema.md](docs/05-database-schema.md) | All Postgres tables, columns, RLS policies |
| [06-authentication.md](docs/06-authentication.md) | How auth works end to end |
| [07-workflow-engine.md](docs/07-workflow-engine.md) | How workflows are executed node by node |
| [08-node-system.md](docs/08-node-system.md) | How nodes are defined and how to add new ones |
| [09-credential-management.md](docs/09-credential-management.md) | How secrets are encrypted and used |
| [10-realtime-streaming.md](docs/10-realtime-streaming.md) | How live execution logs are pushed to the frontend |
| [11-frontend-architecture.md](docs/11-frontend-architecture.md) | Pages, state, data fetching, component responsibilities |
| [12-edge-functions.md](docs/12-edge-functions.md) | All Supabase Edge Functions explained |
| [13-job-scheduling.md](docs/13-job-scheduling.md) | How cron-triggered workflows are scheduled |
| [14-environment-variables.md](docs/14-environment-variables.md) | All env vars for frontend and edge functions |
| [15-local-development.md](docs/15-local-development.md) | How to run the project locally |
| [16-architectural-decisions.md](docs/16-architectural-decisions.md) | Why we made the key technical choices we did |

---

## Quick orientation

- **Frontend** lives in `apps/web/`
- **Shared TypeScript types** live in `packages/types/`
- **Shared validation schemas** live in `packages/validators/`
- **Node definitions/registry** lives in `packages/node-definitions/`
- **Database migrations** live in `supabase/migrations/`
- **Backend logic** lives in `supabase/functions/`

---

## For AI assistants

If you are an AI helping with this project, follow these rules:

1. Read all files in this `docs/` folder before touching any code
2. Never use `any` in TypeScript
3. Always import shared types from `@workflow/types`
4. Always import shared schemas from `@workflow/validators`
5. Always import node metadata from `@workflow/node-definitions`
6. All Supabase queries must go through custom hooks in `apps/web/src/hooks/`
7. Edge Functions must use Deno-compatible imports only
8. Never hardcode secrets anywhere
9. RLS is enabled on every table — always filter by `user_id` or rely on RLS policies
10. Follow the existing folder structure exactly — do not create new top-level folders
