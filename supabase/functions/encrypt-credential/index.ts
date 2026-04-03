// supabase/functions/encrypt-credential/index.ts
// Authenticated Edge Function — encrypts credential data and stores it in the DB.
//
// Updated behavior:
// - validates caller JWT
// - validates caller is a member of the target workspace before insert
// - encrypts plaintext credential payload using AES-256-GCM
// - stores only encrypted_data in credentials table

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

interface EncryptCredentialRequest {
  name: string;
  type: string;
  workspace_id: string;
  data: Record<string, unknown>;
}

interface WorkspaceMembershipRow {
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
}

const ALLOWED_CREDENTIAL_TYPES = new Set([
  "http",
  "oauth2",
  "apiKey",
  "basic",
  "postgres",
  "smtp",
  // Service-specific types
  "google",
  "openai",
  "anthropic",
  "slack",
  "github",
]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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

async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext),
  );

  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return btoa(String.fromCharCode(...combined));
}

async function validateWorkspaceMembership(
  adminClient: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string,
): Promise<{
  ok: boolean;
  role?: "owner" | "admin" | "member";
  reason?: string;
}> {
  // Preferred path: workspace_members (shared workspace model)
  const { data: membership, error: membershipError } = await adminClient
    .from("workspace_members")
    .select("workspace_id, user_id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle<WorkspaceMembershipRow>();

  if (!membershipError && membership) {
    return { ok: true, role: membership.role };
  }

  // Backward-compatible fallback: owner_id check on workspaces
  const { data: workspace, error: workspaceError } = await adminClient
    .from("workspaces")
    .select("id, owner_id")
    .eq("id", workspaceId)
    .maybeSingle<{ id: string; owner_id: string }>();

  if (workspaceError || !workspace) {
    return { ok: false, reason: "workspace_not_found" };
  }

  if (workspace.owner_id !== userId) {
    return { ok: false, reason: "not_workspace_member" };
  }

  return { ok: true, role: "owner" };
}

Deno.serve(async (req: Request) => {
  const options = handleOptions(req);
  if (options) return options;

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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Authorization header required" }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await userClient.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Invalid or expired token" }, 401);
  }

  let body: EncryptCredentialRequest;
  try {
    body = (await req.json()) as EncryptCredentialRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const name = asNonEmptyString(body?.name);
  const type = asNonEmptyString(body?.type);
  const workspaceId = asNonEmptyString(body?.workspace_id);
  const payload = body?.data;

  if (!name || !type || !workspaceId || !isRecord(payload)) {
    return jsonResponse(
      { error: "name, type, workspace_id, and data are required" },
      400,
    );
  }

  if (!ALLOWED_CREDENTIAL_TYPES.has(type)) {
    return jsonResponse({ error: "Unsupported credential type" }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // NEW: validate workspace membership before creating credential
  const membership = await validateWorkspaceMembership(
    adminClient,
    workspaceId,
    user.id,
  );

  if (!membership.ok) {
    if (membership.reason === "workspace_not_found") {
      return jsonResponse({ error: "Workspace not found" }, 404);
    }

    return jsonResponse(
      { error: "Forbidden: you are not a member of this workspace" },
      403,
    );
  }

  // Encrypt payload
  const key = await deriveKey(encryptionKey);
  const encryptedData = await encrypt(JSON.stringify(payload), key);

  // Persist encrypted credential
  const { data: credential, error: insertError } = await adminClient
    .from("credentials")
    .insert({
      user_id: user.id,
      workspace_id: workspaceId,
      name,
      type,
      encrypted_data: encryptedData,
    })
    .select("id, name, type, created_at")
    .single<{
      id: string;
      name: string;
      type: string;
      created_at: string;
    }>();

  if (insertError || !credential) {
    return jsonResponse(
      {
        error: "Failed to store credential",
        detail: insertError?.message,
      },
      500,
    );
  }

  return jsonResponse({
    id: credential.id,
    name: credential.name,
    type: credential.type,
    created_at: credential.created_at,
  });
});
