# 09 — Credential Management

Credentials are sensitive secrets (API keys, OAuth tokens, passwords, database auth, SMTP auth) and must be handled with strict security controls.

This document describes the current credential architecture, including:

- encryption at rest
- runtime decryption for node execution
- OAuth token lifecycle
- workspace-level credential sharing
- management Edge Functions for sharing and membership-aware access

---

## Core security principles

1. **Plaintext secrets are never stored in Postgres**
2. **Frontend never receives raw credential secret values**
3. **Encryption key lives only in Edge Function environment**
4. **Credential decryption is runtime-only and in-memory**
5. **All access paths are authorization-checked (owner, workspace role, or explicit share)**

---

## Data model

## `credentials` (existing)

Stores encrypted credential payloads.

- `id`
- `workspace_id`
- `user_id` (owner/creator)
- `name`
- `type` (`http | oauth2 | apiKey | basic | postgres | smtp`)
- `encrypted_data`
- timestamps

The `encrypted_data` field contains AES-GCM ciphertext.

---

## `workspace_members` (new)

Introduced for workspace collaboration and role-based access.

- `workspace_id`
- `user_id`
- `role` (`owner | admin | member`)
- `invited_by`
- timestamps

Used to determine who can view/manage workspace resources.

---

## `credential_shares` (new)

Introduced for explicit credential sharing inside a workspace.

- `credential_id`
- `workspace_id`
- `shared_by`
- `shared_with` (nullable)
  - `null` => workspace-wide share
  - user id => explicit user-level share
- `can_edit`
- timestamps

This controls access beyond the credential owner.

---

## Encryption architecture

## Algorithm and keying

- Algorithm: **AES-256-GCM**
- Key derivation: PBKDF2 (deterministic salt)
- Key source: `ENCRYPTION_KEY` env var
- Storage format: base64-encoded `iv + ciphertext`

## Guarantees

- DB only stores ciphertext
- Decryption key is not stored in DB
- Raw secrets are only materialized in memory inside Edge Functions

---

## Credential lifecycle flows

## 1) Create credential (manual/api key/basic/etc.)

1. User sends credential metadata + secret payload to backend
2. Backend validates auth and workspace membership
3. Payload is encrypted
4. Encrypted row is inserted into `credentials`
5. Response returns metadata only (id/name/type)

No plaintext secret is returned.

---

## 2) Use credential during workflow execution

1. Node execution requests credential by id
2. Backend resolves/decrypts credential
3. Backend checks authorization (owner/shared access as applicable)
4. Decrypted credential is injected into node executor in-memory
5. Node uses credential for external call
6. Decrypted data is discarded after execution

---

## 3) OAuth credential flow

OAuth credentials are stored as encrypted structured payloads, typically including:

- `access_token`
- `refresh_token`
- `expires_at`
- `token_type`
- `scope`
- provider metadata (`provider`, `token_url`, etc.)

If token is expired during execution, backend auto-refresh can run before node call.

---

## Workspace-level sharing architecture

Workspace sharing enables a credential owner/admin to grant usage access to other workspace members without exposing secret values to frontend.

Access evaluation is based on:

1. **Credential owner**
2. **Workspace membership**
3. **Credential share records**
4. Helper authorization functions in DB policies

### Share modes

- **Explicit user share**
  - `shared_with = <user_id>`
  - optional `can_edit = true/false`

- **Workspace-wide share**
  - `shared_with = null`
  - available to all workspace members
  - edit permissions constrained by policy

---

## Authorization model

At a high level:

- **Owner**: full credential control
- **Workspace admin**: can manage sharing and workspace-scoped resources
- **Member**: can use credentials only if shared (explicitly or workspace-wide)
- **Non-member**: no access

RLS + helper DB functions enforce these constraints server-side.

---

## Edge Functions

## `encrypt-credential`

Purpose:
- authenticated credential creation/update input handling
- encryption + persistence

Key behavior:
- validates user JWT
- validates target workspace membership
- encrypts payload
- inserts into `credentials`

---

## `decrypt-credential`

Purpose:
- runtime credential decrypt for execution path

Key behavior:
- supports secure internal mode
- supports delegated/user-scoped authorization checks
- validates access using sharing rules
- decrypts and returns payload in-memory

---

## `oauth-callback`

Purpose:
- handles provider callback
- exchanges auth code for tokens
- encrypts OAuth payload
- inserts/updates `credentials` record
- redirects to configured success/error URL

Supports configured providers and environment-based provider secrets.

---

## `refresh-oauth-credential`

Purpose:
- refreshes expired oauth2 access tokens
- persists refreshed encrypted payload
- returns updated decrypted payload for immediate runtime use

Internal-only use in execution path.

---

## `manage-credential-shares` (new)

Purpose:
- API surface for credential share CRUD operations

Supported actions:

- `list`
- `share`
- `update`
- `unshare`

Security:
- caller must be authenticated
- admin-level workspace role required for share management writes
- list allows authorized viewers (owner/shared/admin)

---

## `manage-workspace-members` (new)

Purpose:
- workspace membership management API supporting role-aware collaboration

Supported actions:

- `list_members`
- `add_member`
- `update_member_role`
- `remove_member`

Security:
- authenticated only
- admin+ required for mutating membership
- owner role constraints enforced

---

## Backend helper functions (DB-side)

Migration adds helper functions used by policies and functions:

- `is_workspace_member(workspace_id, user_id)`
- `has_workspace_role_at_least(workspace_id, user_id, min_role)`
- `can_use_credential(credential_id, user_id)`

These are used to centralize authorization logic and avoid duplicating permission checks.

---

## What frontend should receive

Frontend should receive **metadata only** unless explicitly required and policy-approved.

Allowed metadata examples:

- `id`
- `name`
- `type`
- `workspace_id`
- `created_at`
- `updated_at`
- share metadata (for management UI)

Never expose:

- `encrypted_data`
- decrypted token values
- `refresh_token`
- OAuth client secrets

---

## Operational guidance

## Rotation

- Rotate `ENCRYPTION_KEY` with planned migration strategy
- Rotate OAuth client secrets/provider credentials periodically
- Revoke compromised credentials and remove shares immediately

## Logging discipline

Do not log:

- credential plaintext
- oauth tokens
- client secrets
- decrypted payload dumps

Safe logging:
- credential id
- workspace id
- operation type
- high-level status/error code

---

## Failure modes and expected behavior

1. **Credential not found**
   - return `404`

2. **Caller lacks access**
   - return `403`

3. **Invalid token / auth missing**
   - return `401`

4. **Encryption/decryption failure**
   - return `500` with sanitized error

5. **OAuth refresh failure**
   - return retryable upstream error where appropriate; avoid leaking provider secrets

---

## Summary

Credential management now supports both secure single-user ownership and workspace collaboration through explicit sharing.

The platform now has:

- encrypted-at-rest credentials
- runtime-only decryption
- OAuth callback + refresh lifecycle
- workspace roles + credential sharing model
- dedicated management APIs for shares and members

This design preserves strict secret handling while enabling practical multi-user workflow operations.