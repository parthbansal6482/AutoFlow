// supabase/functions/refresh-oauth-credential/index.ts
// Internal Edge Function — refreshes OAuth access token for a stored credential
// and persists the updated encrypted payload.
//
// Security model:
// - Only callable with service role bearer token (internal use)
// - Never returns raw client secrets
// - Returns refreshed plaintext data for immediate runtime use (in-memory usage)
// - Stores encrypted updated credential payload back to DB
//
// Request body:
// {
//   credential_id: string,
//   force?: boolean
// }
//
// Optional persisted credential data fields expected (inside encrypted payload):
// {
//   provider?: string,
//   token_url?: string,
//   client_id?: string,
//   client_secret?: string,
//   refresh_token?: string,
//   access_token?: string,
//   expires_at?: string,        // ISO timestamp
//   scope?: string,
//   extra_params?: Record<string, string>,
//   refresh_request_auth?: "body" | "basic"   // default "body"
// }
//
// Response:
// {
//   refreshed: boolean,
//   credential_id: string,
//   data: Record<string, unknown>,   // decrypted and updated payload
//   expires_at?: string
// }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

interface RefreshOAuthRequest {
  credential_id?: string;
  force?: boolean;
}

interface CredentialRow {
  id: string;
  type: string;
  encrypted_data: string;
}

interface OAuthPayload {
  provider?: string;
  token_url?: string;
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: string;
  scope?: string;
  extra_params?: Record<string, string>;
  refresh_request_auth?: "body" | "basic";
  [key: string]: unknown;
}

// corsHeaders is now imported from ../_shared/cors.ts

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function parseOAuthPayload(value: unknown): OAuthPayload | null {
  if (!isRecord(value)) return null;
  return value as OAuthPayload;
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

async function decrypt(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  return new TextDecoder().decode(plaintext);
}

async function encrypt(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);

  return btoa(String.fromCharCode(...combined));
}

function isTokenExpired(expiresAt: string | null, skewSeconds = 60): boolean {
  if (!expiresAt) return true;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return true;
  return Date.now() + skewSeconds * 1000 >= ts;
}

function computeExpiresAt(
  expiresInSeconds: number | null,
  fallbackMinutes = 55,
): string {
  const seconds =
    expiresInSeconds && Number.isFinite(expiresInSeconds) && expiresInSeconds > 0
      ? Math.floor(expiresInSeconds)
      : fallbackMinutes * 60;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

function parseProviderTokenResponse(body: unknown): {
  accessToken: string | null;
  refreshToken: string | null;
  expiresIn: number | null;
  scope: string | null;
  tokenType: string | null;
  raw: Record<string, unknown>;
} {
  if (!isRecord(body)) {
    return {
      accessToken: null,
      refreshToken: null,
      expiresIn: null,
      scope: null,
      tokenType: null,
      raw: {},
    };
  }

  const accessToken =
    asString(body["access_token"]) ??
    asString(body["accessToken"]) ??
    asString(body["token"]);
  const refreshToken =
    asString(body["refresh_token"]) ??
    asString(body["refreshToken"]) ??
    null;

  const expiresInRaw = body["expires_in"] ?? body["expiresIn"];
  const expiresIn =
    typeof expiresInRaw === "number"
      ? expiresInRaw
      : typeof expiresInRaw === "string"
      ? Number(expiresInRaw)
      : null;

  const scope = asString(body["scope"]);
  const tokenType = asString(body["token_type"]) ?? asString(body["tokenType"]);

  return {
    accessToken,
    refreshToken,
    expiresIn:
      expiresIn !== null && Number.isFinite(expiresIn) ? Number(expiresIn) : null,
    scope,
    tokenType,
    raw: body,
  };
}

async function refreshViaOAuthTokenEndpoint(payload: OAuthPayload): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  scope?: string;
  tokenType?: string;
  providerRaw: Record<string, unknown>;
}> {
  const tokenUrl = asString(payload.token_url);
  const clientId = asString(payload.client_id);
  const clientSecret = asString(payload.client_secret);
  const refreshToken = asString(payload.refresh_token);

  if (!tokenUrl || !clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "OAuth credential missing required refresh fields: token_url, client_id, client_secret, refresh_token",
    );
  }

  const authMode = payload.refresh_request_auth === "basic" ? "basic" : "body";
  const bodyParams = new URLSearchParams();
  bodyParams.set("grant_type", "refresh_token");
  bodyParams.set("refresh_token", refreshToken);

  if (authMode === "body") {
    bodyParams.set("client_id", clientId);
    bodyParams.set("client_secret", clientSecret);
  }

  if (isRecord(payload.extra_params)) {
    for (const [k, v] of Object.entries(payload.extra_params)) {
      if (typeof v === "string") bodyParams.set(k, v);
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (authMode === "basic") {
    headers["Authorization"] = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers,
    body: bodyParams.toString(),
  });

  const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
  let parsed: unknown = null;

  if (contentType.includes("application/json")) {
    parsed = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => "");
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }
  }

  if (!response.ok) {
    const detail = isRecord(parsed) ? JSON.stringify(parsed) : String(parsed);
    throw new Error(
      `OAuth token refresh failed (${response.status} ${response.statusText}): ${detail}`,
    );
  }

  const tokenData = parseProviderTokenResponse(parsed);
  if (!tokenData.accessToken) {
    throw new Error("OAuth token refresh response missing access_token");
  }

  return {
    accessToken: tokenData.accessToken,
    ...(tokenData.refreshToken ? { refreshToken: tokenData.refreshToken } : {}),
    expiresAt: computeExpiresAt(tokenData.expiresIn),
    ...(tokenData.scope ? { scope: tokenData.scope } : {}),
    ...(tokenData.tokenType ? { tokenType: tokenData.tokenType } : {}),
    providerRaw: tokenData.raw,
  };
}

Deno.serve(async (req: Request) => {
  const options = handleOptions(req);
  if (options) return options;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionKey = Deno.env.get("ENCRYPTION_KEY");

  if (!supabaseUrl || !serviceRoleKey || !encryptionKey) {
    return jsonResponse({ error: "Missing required environment variables" }, 500);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (token !== serviceRoleKey) {
    return jsonResponse({ error: "Unauthorized — internal function" }, 401);
  }

  let body: RefreshOAuthRequest;
  try {
    body = (await req.json()) as RefreshOAuthRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const credentialId = asString(body.credential_id ?? null);
  const force = body.force === true;

  if (!credentialId) {
    return jsonResponse({ error: "credential_id is required" }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: credential, error: fetchError } = await adminClient
    .from("credentials")
    .select("id, type, encrypted_data")
    .eq("id", credentialId)
    .single<CredentialRow>();

  if (fetchError || !credential) {
    return jsonResponse({ error: "Credential not found" }, 404);
  }

  if (credential.type !== "oauth2") {
    return jsonResponse(
      { error: "Credential type is not oauth2; refresh not supported" },
      400,
    );
  }

  const key = await deriveKey(encryptionKey);

  let decryptedPayload: OAuthPayload;
  try {
    const plaintext = await decrypt(credential.encrypted_data, key);
    const parsed = JSON.parse(plaintext) as unknown;
    const normalized = parseOAuthPayload(parsed);
    if (!normalized) throw new Error("Invalid decrypted credential payload");
    decryptedPayload = normalized;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: `Failed to decrypt credential: ${message}` }, 500);
  }

  const currentAccessToken = asString(decryptedPayload.access_token);
  const currentExpiresAt = asString(decryptedPayload.expires_at);
  const refreshToken = asString(decryptedPayload.refresh_token);

  if (!refreshToken) {
    return jsonResponse(
      { error: "OAuth credential does not include refresh_token" },
      400,
    );
  }

  const expired = isTokenExpired(currentExpiresAt);
  if (!force && !expired && currentAccessToken) {
    return jsonResponse({
      refreshed: false,
      credential_id: credential.id,
      data: decryptedPayload,
      expires_at: currentExpiresAt,
    });
  }

  let refreshed: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: string;
    scope?: string;
    tokenType?: string;
    providerRaw: Record<string, unknown>;
  };

  try {
    refreshed = await refreshViaOAuthTokenEndpoint(decryptedPayload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 502);
  }

  const updatedPayload: OAuthPayload = {
    ...decryptedPayload,
    access_token: refreshed.accessToken,
    expires_at: refreshed.expiresAt,
    ...(refreshed.refreshToken ? { refresh_token: refreshed.refreshToken } : {}),
    ...(refreshed.scope ? { scope: refreshed.scope } : {}),
    ...(refreshed.tokenType ? { token_type: refreshed.tokenType } : {}),
    refreshed_at: new Date().toISOString(),
    last_refresh_response: refreshed.providerRaw,
  };

  let updatedEncrypted: string;
  try {
    updatedEncrypted = await encrypt(JSON.stringify(updatedPayload), key);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: `Failed to encrypt updated credential: ${message}` }, 500);
  }

  const { error: updateError } = await adminClient
    .from("credentials")
    .update({
      encrypted_data: updatedEncrypted,
      updated_at: new Date().toISOString(),
    })
    .eq("id", credential.id);

  if (updateError) {
    return jsonResponse(
      {
        error: "Failed to persist refreshed credential",
        detail: updateError.message,
      },
      500,
    );
  }

  return jsonResponse({
    refreshed: true,
    credential_id: credential.id,
    data: updatedPayload,
    expires_at: refreshed.expiresAt,
  });
});
