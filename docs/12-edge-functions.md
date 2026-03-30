# 12 — Supabase Edge Functions

Edge Functions are the backend execution layer. They run on Deno and power workflow orchestration, node execution, webhooks, credential encryption/decryption, OAuth lifecycle, execution lifecycle operations, and workspace sharing operations.

This document reflects the current backend implementation, including:
- Priority 2 backend capabilities (HTTP node expansion, expressions, OAuth callback/refresh, rerun/delete execution)
- workspace membership and credential sharing APIs
- shared credential authorization behavior in credential decryption

---

## Runtime model

- Functions are stateless and invoked per request
- Data persistence is in Postgres (Supabase)
- Sensitive operations use service-role clients where required
- User-facing operations validate user JWT before performing state changes
- Execution progress is persisted to `executions` and `execution_logs`

---

## Core execution functions

## `execute-workflow`

**Path:** `supabase/functions/execute-workflow/index.ts`  
**Purpose:** Orchestrates complete workflow runs.

### Responsibilities
1. Validate request and env
2. Load workflow
3. Create execution row (`running`)
4. Traverse graph with branch-aware routing
5. Insert/update node logs
6. Finalize execution row (`success`/`error`)
7. Apply workflow-level retry (`settings.max_retries`)

### Input
```Workflow Automation/supabase/functions/execute-workflow/index.ts#L1-30
{
  "workflow_id": "uuid",
  "triggered_by": "manual | webhook | cron",
  "initial_data": {}
}
```

### Output
```Workflow Automation/supabase/functions/execute-workflow/index.ts#L1-40
{
  "execution_id": "uuid",
  "status": "success | error",
  "error": "optional"
}
```

---

## `execute-node`

**Path:** `supabase/functions/execute-node/index.ts`  
**Purpose:** Runs one node execution and returns normalized output.

### Responsibilities
- Normalize input to canonical `NodeData`
- Resolve credential (with OAuth auto-refresh if expired)
- Dispatch executor by `node_type`
- Return stable `{ output, error, branch }`

### Input
```Workflow Automation/supabase/functions/execute-node/index.ts#L1-40
{
  "node_type": "string",
  "parameters": {},
  "credential_id": "uuid | null",
  "input_data": [],
  "execution_id": "uuid",
  "workflow_id": "uuid"
}
```

### Output
```Workflow Automation/supabase/functions/execute-node/index.ts#L1-40
{
  "output": [],
  "error": "string | null",
  "branch": "string | null"
}
```

---

## Trigger functions

## `webhook-receiver`

**Path:** `supabase/functions/webhook-receiver/index.ts`  
**Purpose:** Public webhook entrypoint that resolves a matching active workflow and triggers execution.

### Hardening
- Path normalization + strict path matching
- Strict method matching
- Optional webhook secret validation (header/query)
- Sanitized forwarded headers
- Fire-and-forget execution trigger

---

## Credential security and OAuth functions

## `encrypt-credential`

**Path:** `supabase/functions/encrypt-credential/index.ts`  
**Purpose:** Encrypts credential payload and stores ciphertext.

### Behavior
- Requires authenticated user JWT
- Validates workspace membership before insert
- Encrypts using AES-GCM with `ENCRYPTION_KEY`
- Stores only `encrypted_data` in DB

---

## `decrypt-credential`

**Path:** `supabase/functions/decrypt-credential/index.ts`  
**Purpose:** Decrypts credential payload for backend runtime use.

### Authorization modes
1. **Service internal** (service bearer token, no user scope)
2. **Service delegated** (service bearer + `x-user-id`, enforces user access)
3. **User JWT mode** (enforces user access)

### Shared credential enforcement
For user-scoped/delegated calls, access is checked via:
- `public.can_use_credential(credential_id, user_id)`

This allows decryption only if user is:
- credential owner, or
- allowed through credential sharing records + workspace membership rules.

---

## `oauth-callback`

**Path:** `supabase/functions/oauth-callback/index.ts`  
**Purpose:** OAuth code callback handler; exchanges code for tokens and stores encrypted oauth2 credential payload.

### Flow
1. Read `code` + `state`
2. Decode state
3. Exchange code at provider token endpoint
4. Encrypt token payload
5. Insert/update credential row (`type = oauth2`)
6. Redirect to success/error URL

Supported providers:
- Google
- GitHub
- Slack
- Notion

---

## `refresh-oauth-credential`

**Path:** `supabase/functions/refresh-oauth-credential/index.ts`  
**Purpose:** Internal token refresh endpoint for oauth2 credentials.

### Flow
1. Service-only auth
2. Load + decrypt oauth credential
3. Refresh via token endpoint
4. Update encrypted payload in DB
5. Return refreshed payload for immediate in-memory use

---

## Execution lifecycle utility functions

## `rerun-execution`

**Path:** `supabase/functions/rerun-execution/index.ts`  
**Purpose:** Re-run workflow from previous execution context.

### Flow
- Validate user JWT
- Ownership check
- Read earliest `execution_logs.input_data`
- Trigger `execute-workflow` with `triggered_by = manual`

---

## `delete-execution`

**Path:** `supabase/functions/delete-execution/index.ts`  
**Purpose:** Delete one execution record (and logs via FK cascade).

### Flow
- Validate user JWT
- Ownership check
- Delete execution row

---

## Workspace sharing functions (new)

These functions implement workspace-level collaboration and credential sharing operations.

## `manage-workspace-members`

**Path:** `supabase/functions/manage-workspace-members/index.ts`  
**Purpose:** Manage workspace membership.

### Actions
- `list_members`
- `add_member`
- `update_member_role`
- `remove_member`

### Request shape
```Workflow Automation/supabase/functions/manage-workspace-members/index.ts#L1-50
{
  "action": "list_members | add_member | update_member_role | remove_member",
  "workspace_id": "uuid",
  "user_id": "uuid (required for add/update/remove)",
  "role": "admin | member (required for add/update)"
}
```

### Authorization
- `list_members`: requires member+
- `add/update/remove`: requires admin+
- owner role assignment/modification via this endpoint is blocked

---

## `manage-credential-shares`

**Path:** `supabase/functions/manage-credential-shares/index.ts`  
**Purpose:** Manage explicit credential share records.

### Actions
- `list`
- `share`
- `update`
- `unshare`

### Request shapes
```Workflow Automation/supabase/functions/manage-credential-shares/index.ts#L1-90
{
  "action": "list",
  "credential_id": "uuid"
}
```

```Workflow Automation/supabase/functions/manage-credential-shares/index.ts#L1-110
{
  "action": "share",
  "credential_id": "uuid",
  "workspace_id": "uuid",
  "shared_with": "uuid | null",
  "can_edit": false
}
```

```Workflow Automation/supabase/functions/manage-credential-shares/index.ts#L1-130
{
  "action": "update",
  "share_id": "uuid",
  "can_edit": true
}
```

```Workflow Automation/supabase/functions/manage-credential-shares/index.ts#L1-145
{
  "action": "unshare",
  "share_id": "uuid"
}
```

### Authorization
- Share management requires workspace admin+
- List allowed for:
  - users who can use credential (`can_use_credential`)
  - or workspace admins
- Workspace-wide share (`shared_with = null`) cannot set `can_edit = true`

---

## Workspace sharing database contract (for function behavior)

These functions depend on migration-backed objects:

- `public.workspace_members`
- `public.credential_shares`
- `public.workspace_role` enum
- `public.has_workspace_role_at_least(...)`
- `public.is_workspace_member(...)`
- `public.can_use_credential(...)`

---

## Expressions and templating (backend utility)

## `execute-node/utils/expressions.ts`

Supports safe parameter interpolation:
- `{{ ... }}` templates
- roots:
  - `$json`
  - `$item`
  - `$input`
  - `$credentials`
  - `$env`
- recursive object/array resolution

Integrated in:
- `http-request`
- `set`
- `if`

---

## HTTP Request node backend expansion (Priority 2)

Implemented backend capabilities:
- expression-aware params
- auth normalization
- timeout
- retry/backoff
- pagination (`page`, `offset`, `cursor`, `link-header`)
- response format control

---

## Environment + API behavior summary for workspace sharing

### Membership API behavior
- add/update/remove member operations are role-gated
- owner membership remains protected
- members can enumerate workspace members

### Credential sharing API behavior
- admins can grant/revoke explicit credential shares
- user-level and workspace-wide shares supported
- edit rights can be granted only on explicit user shares

### Credential decrypt behavior with sharing
- runtime decryption now supports shared credentials when caller/user is authorized
- enforced through `can_use_credential` helper

---

## Deployment checklist

Deploy or redeploy these functions after updates:
- `execute-workflow`
- `execute-node`
- `webhook-receiver`
- `encrypt-credential`
- `decrypt-credential`
- `oauth-callback`
- `refresh-oauth-credential`
- `rerun-execution`
- `delete-execution`
- `manage-workspace-members`
- `manage-credential-shares`

Also ensure DB migrations for workspace sharing are applied before enabling sharing APIs in production.

---

## Security notes

- Never expose service role key in frontend
- Never log plaintext credentials/tokens
- Enforce JWT validation for user-facing management functions
- Keep workspace role checks server-side
- Keep OAuth client secrets and encryption key in server-side secrets only

---