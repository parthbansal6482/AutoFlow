# 15 — Local Development

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | v20+ | https://nodejs.org or `nvm install 22` |
| pnpm | v9+ | `npm install -g pnpm` |
| Docker Desktop | Latest | https://docker.com/products/docker-desktop |
| Supabase CLI | v2.75+ | `brew install supabase/tap/supabase` |

Docker Desktop must be **running** (the whale icon in your menu bar) before
starting Supabase. Supabase local dev runs inside Docker containers.

---

## First time setup

```bash
# 1. Enter the project
cd ~/Projects/"Workflow Automation"

# 2. Install all dependencies
pnpm install

# 3. Start local Supabase (Docker must be running)
pnpm sb:start

# 4. Copy the printed anon key and URL into the frontend env file
#    The CLI prints them after start completes
cp apps/web/.env.local.example apps/web/.env.local
# Then edit .env.local and paste in the values

# 5. Apply database migrations
pnpm sb:migrate

# 6. Start the frontend dev server
pnpm dev
```

---

## Daily development commands

```bash
# Start local Supabase (if it's not already running)
pnpm sb:start

# Start the frontend
pnpm dev

# Stop Supabase when done
pnpm sb:stop
```

---

## Local service URLs

| Service | URL | What it is |
|---|---|---|
| Frontend | http://localhost:5173 | Your React app |
| Supabase API | http://localhost:54321 | REST + Auth + Realtime endpoint |
| Supabase Studio | http://localhost:54323 | Visual DB browser and admin UI |
| Supabase Inbucket | http://localhost:54324 | Catches all emails locally (no real emails sent) |
| Supabase DB | localhost:54322 | Direct Postgres connection |

---

## Database commands

```bash
# Apply all pending migrations
pnpm sb:migrate

# Reset the DB — drops everything and re-runs all migrations + seed
pnpm sb:reset

# Create a new migration file
supabase migration new your_migration_name
# Creates: supabase/migrations/<timestamp>_your_migration_name.sql
```

---

## Edge Functions locally

```bash
# Serve all edge functions locally
supabase functions serve

# Serve a specific function
supabase functions serve execute-workflow

# Test a function with curl
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/execute-workflow' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"workflow_id": "your-workflow-uuid"}'
```

---

## TypeScript type checking

```bash
# Typecheck all packages
pnpm typecheck

# Typecheck just the frontend
pnpm --filter web typecheck
```

---

## Adding a new migration

Never edit existing migration files. Always create new ones:

```bash
supabase migration new add_scheduled_jobs_table
```

This creates `supabase/migrations/<timestamp>_add_scheduled_jobs_table.sql`.
Write your SQL in that file, then run `pnpm sb:migrate`.

---

## Common issues

**"Cannot connect to Docker"**
Docker Desktop is not running. Open it and wait for the whale icon to stop animating.

**"Port already in use"**
Another process is using port 54321 or 54323. Stop any other Supabase instances:
```bash
supabase stop --all
```

**"Module not found: @workflow/types"**
Run `pnpm install` from the root. The workspace links may have been broken.

**Vite can't find env variables**
Make sure `apps/web/.env.local` exists and has the correct values from `supabase start`.
Variables must start with `VITE_` to be accessible in the browser.

**"relation does not exist" errors in Supabase Studio**
The migration hasn't been applied yet. Run `pnpm sb:migrate`.
