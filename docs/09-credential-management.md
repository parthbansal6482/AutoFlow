# 09 — Credential Management

Credentials are sensitive secrets — API keys, OAuth tokens, database passwords, SMTP
passwords. They must never be stored in plaintext, never logged, and never exposed to
the frontend beyond their metadata (name, type, id).

---

## The core rule

> The encryption key never touches the database.
> Raw credential data never touches the database.
> Both exist only in Edge Function environment variables and in-memory during execution.

---

## Storage flow (saving a credential)

```
1. User fills in credential form in the frontend
   e.g. { name: "My Slack Bot", type: "apiKey", data: { apiKey: "xoxb-..." } }
          ↓
2. Frontend calls the encrypt-credential Edge Function
   POST /functions/v1/encrypt-credential
   Body: { name, type, data }
   Auth: user's JWT in Authorization header
          ↓
3. encrypt-credential Edge Function:
   - Validates the request (user must be authenticated)
   - Serializes data to JSON string
   - Encrypts using pgcrypto:
     SELECT encode(
       encrypt(
         data::bytea,
         key::bytea,
         'aes'
       ),
       'base64'
     )
   - Where key = Deno.env.get('ENCRYPTION_KEY')
   - Inserts into credentials table:
     { name, type, encrypted_data: '<base64 string>', user_id, workspace_id }
          ↓
4. Frontend receives { id, name, type } — no raw data ever returns to the frontend
```

---

## Usage flow (using a credential during execution)

```
1. execute-workflow finds a node that has a credential_id
          ↓
2. Calls decrypt-credential Edge Function (internal, not public)
   with the credential_id
          ↓
3. decrypt-credential Edge Function:
   - Fetches the credentials row by id
   - Decrypts encrypted_data using the same ENCRYPTION_KEY
   - Returns the decrypted data as a plain object in memory
          ↓
4. execute-node receives the decrypted credential object as credentials parameter
   e.g. { apiKey: "xoxb-..." }
          ↓
5. The node executor uses the value (e.g. sets Authorization header)
   and the credential data is garbage collected when the function finishes
          ↓
6. The raw credential value is never written to any log or database column
```

---

## Encryption details

- Algorithm: AES-256 (via pgcrypto's `encrypt()` function)
- Key: 32-byte string stored in the `ENCRYPTION_KEY` environment variable
- Storage format: base64-encoded encrypted bytes stored as `text` in the DB
- The same key is used for both encryption and decryption (symmetric)

**Generating a secure key:**
```bash
openssl rand -base64 32
```

---

## encrypt-credential Edge Function

**File:** `supabase/functions/encrypt-credential/index.ts`
**Visibility:** Authenticated users only (validates JWT)

Input:
```typescript
{
  name: string
  type: CredentialType
  data: Record<string, string>   // the actual secrets
}
```

Output:
```typescript
{
  id: string
  name: string
  type: string
  created_at: string
}
// raw data is NOT returned
```

---

## decrypt-credential Edge Function

**File:** `supabase/functions/decrypt-credential/index.ts`
**Visibility:** Internal only — called by execute-workflow, never by the frontend

Input:
```typescript
{
  credential_id: string
}
```

Output:
```typescript
{
  data: Record<string, string>   // decrypted credential fields
}
```

---

## OAuth credentials

OAuth credentials (Google, Slack, GitHub, etc.) are more complex because they involve:
- An `access_token` (short-lived)
- A `refresh_token` (long-lived, used to get new access tokens)
- Token expiry timestamps

These are still stored encrypted in the `credentials` table. The `oauth-callback`
Edge Function handles the initial exchange of the OAuth code for tokens and stores
them encrypted. During execution, if the access token is expired, the executor
refreshes it using the refresh token before making API calls.

---

## Frontend credential list

The frontend only ever sees credential metadata — never the raw secret data:

```typescript
interface Credential {
  id: string
  name: string
  type: CredentialType
  user_id: string
  workspace_id: string
  created_at: string
  updated_at: string
  // NO: encrypted_data, NO: raw secret fields
}
```

When a user configures a node that needs a credential, they see a dropdown of
credential names and pick one. The credential's `id` is stored in the workflow node's
`credential_id` field. The raw secret never flows through the frontend at all.

---

## Deleting a credential

When a credential is deleted from the database, any workflow nodes that reference
its `id` will fail on next execution with a "credential not found" error. There is
no cascade — the workflow must be updated manually to remove or replace the
credential reference.
