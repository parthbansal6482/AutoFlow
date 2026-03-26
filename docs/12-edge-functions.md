# 12 — Supabase Edge Functions

Edge Functions are the backend logic layer. They run on Deno (not Node.js) and are
deployed to Supabase's infrastructure. Each function is a self-contained folder
inside `supabase/functions/`.

---

## Deno vs Node.js — key differences

| | Node.js | Deno |
|---|---|---|
| Package imports | `import x from 'package'` (npm) | `import x from 'https://...'` (URL) |
| npm packages | `node_modules/` | No node_modules — fetched by URL via esm.sh |
| TypeScript | Needs compilation step | Native TypeScript support |
| Standard library | Various npm packages | `https://deno.land/std@x.x.x/` |
| Environment variables | `process.env.KEY` | `Deno.env.get('KEY')` |

---

## Import conventions

```typescript
// Deno standard library
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// npm packages via esm.sh
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Environment variables
const url = Deno.env.get('SUPABASE_URL')!
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
```

---

## All Edge Functions

### `execute-workflow`

**File:** `supabase/functions/execute-workflow/index.ts`
**Access:** Called by frontend (authenticated), webhook-receiver, and pg_cron via pg_net
**Purpose:** Orchestrates a full workflow execution from start to finish

What it does:
1. Receives `{ workflow_id, trigger_data }`
2. Fetches the workflow from the DB using the service role client
3. Validates the workflow exists and is active
4. Creates an `executions` row with `status: 'running'`
5. Finds the trigger node (category: 'trigger')
6. Walks the node graph in topological order
7. For each node: inserts an `execution_logs` row, calls `execute-node`, updates the row
8. Updates the `executions` row with final status

Returns: `{ execution_id: string }`

---

### `execute-node`

**File:** `supabase/functions/execute-node/index.ts`
**Access:** Internal only — called by `execute-workflow`, not accessible externally
**Purpose:** Runs a single node and returns its output

What it does:
1. Receives `{ node_type, parameters, credentials?, input_data }`
2. Looks up the executor for `node_type` in the dispatcher map
3. Calls the executor with parameters, credentials, and input data
4. Returns `{ output_data }` or throws an error

Sub-files in `execute-node/nodes/`:
- `http-request.ts` — fetch with configurable method, URL, headers, body
- `if.ts` — evaluate a JS expression, route to true/false output
- `set.ts` — map/add/remove fields on input items
- `code.ts` — run user-supplied JavaScript in a sandboxed context

---

### `webhook-receiver`

**File:** `supabase/functions/webhook-receiver/index.ts`
**Access:** Public — no auth required (anyone can POST to it)
**Purpose:** Receives external webhook POSTs and triggers the associated workflow

What it does:
1. Reads `workflow_id` from query params: `?workflow_id=uuid`
2. Reads the request body as JSON
3. Calls `execute-workflow` internally with the body as `trigger_data`
4. Returns `{ received: true }` immediately (does not wait for execution to finish)

URL format: `https://<project>.supabase.co/functions/v1/webhook-receiver?workflow_id=<uuid>`

Security note: Any public URL can trigger a webhook. If you need to restrict access,
add a secret token to the query params and validate it inside the function.

---

### `encrypt-credential`

**File:** `supabase/functions/encrypt-credential/index.ts`
**Access:** Authenticated users only (validates JWT)
**Purpose:** Encrypts credential data and saves it to the database

What it does:
1. Validates the user's JWT from the Authorization header
2. Receives `{ name, type, data }` in the request body
3. Validates using `CredentialSchema` from `@workflow/validators`
4. Serializes `data` to a JSON string
5. Encrypts using AES-256 via pgcrypto with `ENCRYPTION_KEY` env var
6. Inserts into `credentials` table
7. Returns credential metadata (id, name, type) — never the raw data

---

### `decrypt-credential`

**File:** `supabase/functions/decrypt-credential/index.ts`
**Access:** Internal only — called by `execute-workflow`
**Purpose:** Decrypts a stored credential for use during execution

What it does:
1. Receives `{ credential_id }`
2. Fetches the `credentials` row using the service role client
3. Decrypts `encrypted_data` using pgcrypto with `ENCRYPTION_KEY`
4. Returns `{ data: Record<string, string> }` in memory

The decrypted data is passed to node executors and is never written to any database
column or log.

---

### `oauth-callback`

**File:** `supabase/functions/oauth-callback/index.ts`
**Access:** Public — receives redirect from OAuth provider
**Purpose:** Handles the OAuth2 authorization code flow for integration credentials

What it does:
1. Receives `code` and `state` query params from the OAuth provider redirect
2. Decodes `state` to get `{ user_id, credential_name, provider }`
3. Exchanges the `code` for `access_token` and `refresh_token` with the provider's token endpoint
4. Encrypts the tokens and stores them as a credential
5. Redirects the user back to the credentials page with a success message

---

## Shared Edge Function patterns

### Error handling pattern

```typescript
serve(async (req) => {
  try {
    // ... function logic
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

### Auth validation pattern

```typescript
const authHeader = req.headers.get('Authorization')
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
}

const userClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: authHeader } } }
)

const { data: { user }, error } = await userClient.auth.getUser()
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
}
```

---

## Deploying Edge Functions

```bash
# Deploy a single function
supabase functions deploy execute-workflow

# Deploy all functions
supabase functions deploy

# Set environment variables for production
supabase secrets set ENCRYPTION_KEY=your-32-byte-key
```

## Running locally

```bash
# Serve all functions locally (runs on port 54321/functions/v1)
supabase functions serve
```
