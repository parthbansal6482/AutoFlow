# 14 — Environment Variables

---

## Frontend (`apps/web/.env.local`)

This file is gitignored and must be created manually on each machine.

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=<your local anon key>
```

For production, set these in your hosting provider (Vercel, Cloudflare Pages, etc.)
as environment variables — not in a committed file.

**Where to find local values:**
After running `supabase start`, the CLI prints both values. They are also visible
in the Supabase Studio at `http://localhost:54323` under Settings → API.

**Why `VITE_` prefix?**
Vite only exposes env vars that start with `VITE_` to the browser bundle.
Any variable without this prefix is kept server-side only.

---

## Edge Functions

Edge Functions access env vars via `Deno.env.get('KEY')`.

### Auto-injected by Supabase (no setup needed)

These are automatically available in every Edge Function when deployed to Supabase:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your project's API URL |
| `SUPABASE_ANON_KEY` | The anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | The service role key (bypasses RLS) |
| `SUPABASE_DB_URL` | Direct Postgres connection string |

For local development with `supabase functions serve`, these are also auto-injected
from your local Supabase instance.

### Custom variables (must be set manually)

| Variable | Purpose | How to set |
|---|---|---|
| `ENCRYPTION_KEY` | 32-byte AES-256 key for credential encryption | See below |

**Generating the encryption key:**
```bash
openssl rand -base64 32
```

**Setting for local development:**
Create `supabase/functions/.env`:
```env
ENCRYPTION_KEY=your-generated-key-here
```

**Setting for production:**
```bash
supabase secrets set ENCRYPTION_KEY=your-generated-key-here
```

**Viewing set secrets:**
```bash
supabase secrets list
```

---

## Rules

1. Never commit `.env.local` or `supabase/functions/.env` — both are gitignored
2. Never put the `SUPABASE_SERVICE_ROLE_KEY` in the frontend — it bypasses all RLS
3. Never put the `ENCRYPTION_KEY` anywhere except Edge Function environment
4. The anon key IS safe to expose in the frontend — RLS protects the data
5. Always use `!` (non-null assertion) or proper null checks when calling
   `Deno.env.get()` — a missing env var should fail loudly, not silently
