// supabase/functions/encrypt-credential/index.ts
// Authenticated Edge Function — encrypts credential data and stores it in the DB.
//
// Called by the frontend when a user saves a new credential.
// The plaintext secret NEVER touches the database — only AES-256-GCM ciphertext.
//
// Request body:
//   {
//     name:         string   — display name
//     type:         string   — 'http' | 'oauth2' | 'apiKey' | 'basic' | 'postgres' | 'smtp'
//     workspace_id: string
//     data:         object   — the plaintext credential fields (passwords, tokens, etc.)
//   }
//
// Response:
//   { id: string }  — the new credentials row ID

import { createClient } from "npm:@supabase/supabase-js@2";

// ─── Crypto helpers ───────────────────────────────────────────────────────────

/**
 * Derives a CryptoKey from the raw ENCRYPTION_KEY env var using PBKDF2.
 * We use a fixed salt tied to the project so key derivation is consistent.
 */
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
 * Encrypts plaintext using AES-256-GCM.
 * Returns base64(iv + ciphertext) as a single storable string.
 */
async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );

  // Prepend IV to ciphertext so we can recover it on decryption
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return btoa(String.fromCharCode(...combined));
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

// ─── Request types ────────────────────────────────────────────────────────────

interface EncryptCredentialRequest {
  name: string;
  type: string;
  workspace_id: string;
  data: Record<string, unknown>;
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

  // ── Auth — require a valid user JWT ──────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Authorization header required" }, 401);
  }

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Invalid or expired token" }, 401);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: EncryptCredentialRequest;
  try {
    body = await req.json() as EncryptCredentialRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { name, type, workspace_id, data } = body;

  if (!name || !type || !workspace_id || !data) {
    return jsonResponse({ error: "name, type, workspace_id, and data are required" }, 400);
  }

  // ── Encrypt ───────────────────────────────────────────────────────────────
  const key = await deriveKey(encryptionKey);
  const encrypted_data = await encrypt(JSON.stringify(data), key);

  // ── Store in DB ───────────────────────────────────────────────────────────
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: credential, error: insertError } = await adminClient
    .from("credentials")
    .insert({
      user_id: user.id,
      workspace_id,
      name,
      type,
      encrypted_data,
    })
    .select("id")
    .single<{ id: string }>();

  if (insertError || !credential) {
    return jsonResponse({
      error: "Failed to store credential",
      detail: insertError?.message,
    }, 500);
  }

  return jsonResponse({ id: credential.id });
});
