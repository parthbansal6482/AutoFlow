// supabase/functions/decrypt-credential/index.ts
// Internal Edge Function — decrypts a credential and returns plaintext data.
//
// Updated behavior:
// - Supports internal service-role calls (execute-node) without user context.
// - Supports delegated user-scoped authorization for shared credentials using workspace sharing rules.
// - Enforces that non-service callers can only decrypt credentials they are allowed to use
//   (owner or shared via credential_shares/workspace membership via can_use_credential()).
//
// Request body:
// {
//   credential_id: string
// }
//
// Optional delegated-user header (for internal callers that want user-scoped enforcement):
//   x-user-id: <uuid>
//
// Response:
// {
//   data: Record<string, unknown>
// }

import { createClient } from "npm:@supabase/supabase-js@2";

interface DecryptCredentialRequest {
  credential_id?: string;
}

interface CredentialRow {
  id: string;
  encrypted_data: string;
  workspace_id: string;
  user_id: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-id, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

async function deriveKey(rawKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(rawKey),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("autoflow-credential-salt-v1"),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Decrypts a base64(iv + ciphertext) string produced by encrypt-credential.
 */
async function decrypt(
  encryptedBase64: string,
  key: CryptoKey,
): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) =>
    c.charCodeAt(0),
  );
  const iv = combined.slice(0, 12); // First 12 bytes = IV
  const ciphertext = combined.slice(12); // Remaining bytes = ciphertext

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(plaintext);
}

// ─── Authorization helpers ───────────────────────────────────────────────────

/**
 * Checks whether the given user can use/decrypt the credential via DB helper.
 * Uses function introduced in workspace sharing migration:
 *   public.can_use_credential(credential_id, user_id) -> boolean
 */
async function canUserUseCredential(
  adminClient: ReturnType<typeof createClient>,
  credentialId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await adminClient.rpc("can_use_credential", {
    p_credential_id: credentialId,
    p_user_id: userId,
  });

  if (error) return false;
  return data === true;
}

/**
 * Determine caller mode:
 * 1) Pure internal call with service role bearer token (no user enforcement)
 * 2) Internal call with service role token + delegated x-user-id (enforce sharing rules)
 * 3) User JWT call (enforce sharing rules)
 *
 * Returns:
 * - effectiveUserId: user id to enforce access for, or null if fully trusted internal call
 */
async function resolveEffectiveUserId(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey: string,
): Promise<{
  effectiveUserId: string | null;
  mode: "service" | "service-delegated" | "user";
}> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearer = authHeader.replace("Bearer ", "").trim();
  const delegatedUserId = asNonEmptyString(req.headers.get("x-user-id"));

  // Service role internal call
  if (bearer === serviceRoleKey) {
    if (delegatedUserId) {
      return { effectiveUserId: delegatedUserId, mode: "service-delegated" };
    }
    return { effectiveUserId: null, mode: "service" };
  }

  // User JWT call
  if (!bearer) {
    throw new Error("Unauthorized");
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return { effectiveUserId: user.id, mode: "user" };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionKey = Deno.env.get("ENCRYPTION_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !encryptionKey) {
    return jsonResponse(
      { error: "Missing required environment variables" },
      500,
    );
  }

  let body: DecryptCredentialRequest;
  try {
    body = (await req.json()) as DecryptCredentialRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const credentialId = asNonEmptyString(body.credential_id);
  if (!credentialId) {
    return jsonResponse({ error: "credential_id is required" }, 400);
  }

  // Resolve caller mode and effective user
  let authCtx: {
    effectiveUserId: string | null;
    mode: "service" | "service-delegated" | "user";
  };
  try {
    authCtx = await resolveEffectiveUserId(
      req,
      supabaseUrl,
      anonKey,
      serviceRoleKey,
    );
  } catch {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch encrypted credential
  const { data: credential, error: fetchError } = await adminClient
    .from("credentials")
    .select("id, encrypted_data, workspace_id, user_id")
    .eq("id", credentialId)
    .single<CredentialRow>();

  if (fetchError || !credential) {
    return jsonResponse({ error: "Credential not found" }, 404);
  }

  // Authorization enforcement for user/delegated-user calls
  if (authCtx.effectiveUserId) {
    const allowed = await canUserUseCredential(
      adminClient,
      credential.id,
      authCtx.effectiveUserId,
    );

    if (!allowed) {
      return jsonResponse(
        {
          error: "Forbidden",
          detail: "You do not have access to this credential",
        },
        403,
      );
    }
  }

  // Decrypt
  let plaintextData: Record<string, unknown>;
  try {
    const key = await deriveKey(encryptionKey);
    const plaintext = await decrypt(credential.encrypted_data, key);
    const parsed = JSON.parse(plaintext) as unknown;

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return jsonResponse(
        { error: "Decrypted credential payload is invalid" },
        500,
      );
    }

    plaintextData = parsed as Record<string, unknown>;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[decrypt-credential] Decryption failed:", message);
    return jsonResponse(
      { error: "Decryption failed — check ENCRYPTION_KEY" },
      500,
    );
  }

  return jsonResponse({
    data: plaintextData,
    meta: {
      mode: authCtx.mode,
      credential_id: credential.id,
    },
  });
});
