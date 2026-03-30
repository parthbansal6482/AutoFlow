# 14 — Environment Variables

This document lists all environment variables used across the project, including
new OAuth provider and callback settings for backend Edge Functions.

---

## Frontend (`apps/web/.env.local`)

Create this file manually on each machine. It must stay gitignored.

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<your local anon key>

# Optional: where OAuth callback should redirect users after success/error
# (used by frontend routing logic if you choose to expose it)
VITE_OAUTH_REDIRECT_URL=http://localhost:5173/credentials
```

For production, configure these in your hosting provider (Vercel, Netlify, Cloudflare, etc.),
not in committed files.

---

## Edge Functions

Edge Functions read variables via `Deno.env.get('KEY')`.

### Auto-injected by Supabase

These are available automatically in deployed and local Supabase function runtimes:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Project API URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `SUPABASE_DB_URL` | Direct database connection URL |

---

## Custom Edge Function variables (must be set)

### Core security

| Variable | Required | Purpose |
|---|---|---|
| `ENCRYPTION_KEY` | Yes | AES-256 key material for credential encryption/decryption |

Generate a strong key:

```bash
openssl rand -base64 32
```

---

### Workflow execution internals

| Variable | Required | Purpose |
|---|---|---|
| `EXECUTE_NODE_URL` | Yes | Internal URL for `execute-workflow` to call `execute-node` |
| `EXECUTE_WORKFLOW_URL` | Yes | Internal URL for trigger functions (webhook/cron/rerun) to call `execute-workflow` |

Example values (local Supabase default port):

```env
EXECUTE_NODE_URL=http://127.0.0.1:54321/functions/v1/execute-node
EXECUTE_WORKFLOW_URL=http://127.0.0.1:54321/functions/v1/execute-workflow
```

---

## OAuth callback + redirect settings

These are used by `supabase/functions/oauth-callback/index.ts`.

| Variable | Required | Purpose |
|---|---|---|
| `OAUTH_CALLBACK_URL` | Yes | Exact callback URL registered with OAuth providers |
| `OAUTH_SUCCESS_REDIRECT_URL` | Yes (recommended) | Frontend URL to redirect users after OAuth callback handling |

Example:

```env
OAUTH_CALLBACK_URL=http://127.0.0.1:54321/functions/v1/oauth-callback
OAUTH_SUCCESS_REDIRECT_URL=http://localhost:5173/credentials
```

> `OAUTH_CALLBACK_URL` must exactly match what is configured in each provider app.

---

## OAuth provider credentials

Set only providers you actually use.

### Google

| Variable | Required | Purpose |
|---|---|---|
| `GOOGLE_CLIENT_ID` | If Google OAuth is used | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | If Google OAuth is used | OAuth client secret |

### GitHub

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_CLIENT_ID` | If GitHub OAuth is used | OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | If GitHub OAuth is used | OAuth app client secret |

### Slack

| Variable | Required | Purpose |
|---|---|---|
| `SLACK_CLIENT_ID` | If Slack OAuth is used | Slack app client ID |
| `SLACK_CLIENT_SECRET` | If Slack OAuth is used | Slack app client secret |

### Notion

| Variable | Required | Purpose |
|---|---|---|
| `NOTION_CLIENT_ID` | If Notion OAuth is used | Notion OAuth client ID |
| `NOTION_CLIENT_SECRET` | If Notion OAuth is used | Notion OAuth client secret |

---

## Optional backend expression support

If you choose to expose controlled environment values inside expression templates
(via `$env.KEY` in backend parameter resolution), define non-sensitive vars only.

Example:

```env
API_BASE_URL=https://api.example.com
DEFAULT_TIMEZONE=UTC
```

Do **not** expose secrets this way unless you explicitly intend backend-only usage and
understand the security implications.

---

## Local development setup

Create `supabase/functions/.env` with at least:

```env
ENCRYPTION_KEY=<generated-32-byte-key>

EXECUTE_NODE_URL=http://127.0.0.1:54321/functions/v1/execute-node
EXECUTE_WORKFLOW_URL=http://127.0.0.1:54321/functions/v1/execute-workflow

OAUTH_CALLBACK_URL=http://127.0.0.1:54321/functions/v1/oauth-callback
OAUTH_SUCCESS_REDIRECT_URL=http://localhost:5173/credentials

# Provider creds (set only what you use)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
NOTION_CLIENT_ID=
NOTION_CLIENT_SECRET=
```

---

## Production secrets

Set secrets using Supabase CLI:

```bash
supabase secrets set ENCRYPTION_KEY=...
supabase secrets set EXECUTE_NODE_URL=...
supabase secrets set EXECUTE_WORKFLOW_URL=...
supabase secrets set OAUTH_CALLBACK_URL=...
supabase secrets set OAUTH_SUCCESS_REDIRECT_URL=...

# Provider secrets as needed
supabase secrets set GOOGLE_CLIENT_ID=...
supabase secrets set GOOGLE_CLIENT_SECRET=...
supabase secrets set GITHUB_CLIENT_ID=...
supabase secrets set GITHUB_CLIENT_SECRET=...
supabase secrets set SLACK_CLIENT_ID=...
supabase secrets set SLACK_CLIENT_SECRET=...
supabase secrets set NOTION_CLIENT_ID=...
supabase secrets set NOTION_CLIENT_SECRET=...
```

List configured secrets:

```bash
supabase secrets list
```

---

## Security rules (important)

1. Never commit `.env.local` or `supabase/functions/.env`.
2. Never expose `SUPABASE_SERVICE_ROLE_KEY` to frontend/browser code.
3. Never log OAuth client secrets, access tokens, refresh tokens, or `ENCRYPTION_KEY`.
4. Keep provider secrets in server-side secret storage only.
5. Ensure callback URL allowlists in providers exactly match your deployed callback URL.
6. Rotate OAuth secrets and encryption keys according to your security policy.

---