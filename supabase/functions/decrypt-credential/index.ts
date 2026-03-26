// supabase/functions/decrypt-credential/index.ts
// Internal Edge Function — decrypts a credential and returns the plaintext data.
//
// IMPORTANT: This function must NEVER be callable by end users directly.
// It is only called by execute-node (using the service_role key) when a node
// needs to inject credential values at runtime.
//
// Request body:
//   { credential_id: string }
//
// Response:
//   { data: Record<string, unknown> }  — the decrypted credential fields

import { createClient } from "npm:@supabase/supabase-js@2";

// ─── Crypto helpers ───────────────────────────────────────────────────────────

async function deriveKey(rawKey: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(rawKey),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
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
    ["encrypt", "decrypt"]
  );
}

/**
 * Decrypts a base64(iv + ciphertext) string produced by encrypt-credential.
 */
async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, 12);           // First 12 bytes = IV
  const ciphertext = combined.slice(12);      // Remaining bytes = ciphertext

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plaintext);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── DB row type ──────────────────────────────────────────────────────────────

interface CredentialRow {
  id: string;
  encrypted_data: string;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── Environment ──────────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionKey = Deno.env.get("ENCRYPTION_KEY");

  if (!supabaseUrl || !serviceRoleKey || !encryptionKey) {
    return jsonResponse({ error: "Missing required environment variables" }, 500);
  }

  // ── Auth — only service_role may call this function ───────────────────────
  // execute-node always calls this with its service_role bearer token.
  // Any other caller (anon, user JWT) is rejected.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (token !== serviceRoleKey) {
    return jsonResponse({ error: "Unauthorized — internal function" }, 401);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let credentialId: string;
  try {
    const body = await req.json() as { credential_id?: string };
    credentialId = body.credential_id ?? "";
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!credentialId) {
    return jsonResponse({ error: "credential_id is required" }, 400);
  }

  // ── Fetch encrypted credential from DB ────────────────────────────────────
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: credential, error: fetchError } = await adminClient
    .from("credentials")
    .select("id, encrypted_data")
    .eq("id", credentialId)
    .single<CredentialRow>();

  if (fetchError || !credential) {
    return jsonResponse({ error: "Credential not found" }, 404);
  }

  // ── Decrypt ───────────────────────────────────────────────────────────────
  let plaintextData: Record<string, unknown>;
  try {
    const key = await deriveKey(encryptionKey);
    const plaintext = await decrypt(credential.encrypted_data, key);
    plaintextData = JSON.parse(plaintext) as Record<string, unknown>;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[decrypt-credential] Decryption failed:", message);
    return jsonResponse({ error: "Decryption failed — check ENCRYPTION_KEY" }, 500);
  }

  return jsonResponse({ data: plaintextData });
});
