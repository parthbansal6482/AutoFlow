# 05 — Database Schema

All tables live in the `public` schema in Supabase Postgres (PostgreSQL 15).
Row Level Security (RLS) is enabled on every single table — no exceptions.

Migration files live in `supabase/migrations/` and are run in filename order.

---

## Extensions

These Postgres extensions are enabled in the initial migration:

| Extension | Purpose |
|---|---|
| `uuid-ossp` | `uuid_generate_v4()` for primary keys |
| `pgcrypto` | AES-256 encryption for credentials |
| `pg_cron` | Scheduling cron jobs inside Postgres |
| `pg_net` | Outbound HTTP calls from Postgres |

---

## Tables

### `profiles`

Extends Supabase's built-in `auth.users` table. Created automatically when a user
signs up via a database trigger on `auth.users`.

```
id          uuid        PK, FK → auth.users(id) ON DELETE CASCADE
full_name   text
avatar_url  text
created_at  timestamptz DEFAULT now()
```

**RLS policies:**
- `SELECT` — user can only read their own row (`auth.uid() = id`)
- `UPDATE` — user can only update their own row

---

### `workspaces`

Multi-tenancy support. Every workflow and credential belongs to a workspace.
Initially each user gets one personal workspace.

```
id          uuid        PK, DEFAULT uuid_generate_v4()
name        text        NOT NULL
owner_id    uuid        FK → profiles(id) ON DELETE CASCADE
created_at  timestamptz DEFAULT now()
```

**RLS policies:**
- `ALL` — owner can do everything (`owner_id = auth.uid()`)

---

### `workflows`

The core table. Each row is one workflow. Nodes and connections are stored as JSONB
because the graph structure is flexible — different node types have different shapes
and adding new node types would require schema migrations if stored relationally.

```
id            uuid        PK, DEFAULT uuid_generate_v4()
workspace_id  uuid        FK → workspaces(id) ON DELETE CASCADE
user_id       uuid        FK → profiles(id) ON DELETE CASCADE
name          text        NOT NULL
description   text
active        boolean     DEFAULT false
nodes         jsonb       NOT NULL DEFAULT '[]'   -- WorkflowNode[]
connections   jsonb       NOT NULL DEFAULT '[]'   -- WorkflowConnection[]
settings      jsonb       NOT NULL DEFAULT '{}'   -- WorkflowSettings
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()           -- auto-updated by trigger
```

**Trigger:** `update_updated_at` fires `BEFORE UPDATE` to set `updated_at = now()`.

**RLS policies:**
- `ALL` — user can only access workflows where `user_id = auth.uid()`

---

### `credentials`

Stores encrypted secrets. The `encrypted_data` column contains the AES-256 encrypted
JSON string of the credential fields (API key, token, password, etc.). The plaintext
is never stored.

```
id              uuid        PK, DEFAULT uuid_generate_v4()
workspace_id    uuid        FK → workspaces(id) ON DELETE CASCADE
user_id         uuid        FK → profiles(id) ON DELETE CASCADE
name            text        NOT NULL
type            text        NOT NULL   -- CredentialType enum value
encrypted_data  text        NOT NULL   -- AES-256 encrypted via pgcrypto
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

**Trigger:** `update_updated_at` fires `BEFORE UPDATE`.

**RLS policies:**
- `ALL` — user can only access credentials where `user_id = auth.uid()`

---

### `executions`

One row per workflow run. Tracks the overall status and timing of the run.

```
id            uuid        PK, DEFAULT uuid_generate_v4()
workflow_id   uuid        FK → workflows(id) ON DELETE CASCADE
status        text        NOT NULL DEFAULT 'pending'   -- ExecutionStatus
triggered_by  text        NOT NULL DEFAULT 'manual'   -- 'manual' | 'webhook' | 'cron'
started_at    timestamptz DEFAULT now()
finished_at   timestamptz
error         text        -- populated if status = 'error'
```

**RLS policies:**
- `SELECT` — user can read executions for their own workflows only
  (join through `workflows` table filtering on `user_id`)

---

### `execution_logs`

One row per node per workflow run. This is the most-read table in the app —
the frontend subscribes to it via Supabase Realtime during a run.

```
id            uuid        PK, DEFAULT uuid_generate_v4()
execution_id  uuid        FK → executions(id) ON DELETE CASCADE
node_id       text        NOT NULL   -- matches WorkflowNode.id
node_name     text        NOT NULL   -- display name at time of execution
status        text        NOT NULL DEFAULT 'pending'
input_data    jsonb                  -- data passed into this node
output_data   jsonb                  -- data produced by this node
error         text                   -- error message if status = 'error'
started_at    timestamptz DEFAULT now()
finished_at   timestamptz
duration_ms   integer                -- finished_at - started_at in milliseconds
```

**RLS policies:**
- `SELECT` — user can read logs for executions that belong to their own workflows
  (double join: execution_logs → executions → workflows → user_id)

---

## Triggers

### `update_updated_at()`

A reusable trigger function that sets `updated_at = now()` before any update.
Applied to `workflows` and `credentials`.

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Entity relationships

```
auth.users (Supabase managed)
    |
    └── profiles (1:1)
            |
            └── workspaces (1:many)
                    |
                    ├── workflows (1:many)
                    │       |
                    │       └── executions (1:many)
                    │               |
                    │               └── execution_logs (1:many)
                    │
                    └── credentials (1:many)
```

---

## Migration files

| File | Description |
|---|---|
| `0001_initial_schema.sql` | Extensions, all tables, RLS, triggers |

New migrations are added as new numbered files. Never edit an existing migration
that has already been run — always create a new file.
