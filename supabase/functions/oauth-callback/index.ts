// supabase/functions/oauth-callback/index.ts
// OAuth callback handler:
// 1) validates OAuth callback params
// 2) exchanges authorization code for tokens at provider token endpoint
// 3) encrypts token payload with AES-256-GCM (same scheme as encrypt-credential)
// 4) stores/updates credential row in `public.credentials`
// 5) redirects user back to app

import { createClient } from "npm:@supabase/supabase-js@2";

type OAuthProvider = "google" | "github" | "slack" | "notion";

interface OAuthState {
  user_id: string;
  workspace_id: string;
  credential_name: string;
  provider: OAuthProvider;
  credential_id?: string;
  redirect_to?: string;
}

interface OAuthProviderConfig {
  tokenEndpoint: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes?: string;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redirect(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      ...corsHeaders,
    },
  });
}

function safeUrl(url: string | undefined, fallback: string): string {
  if (!url) return fallback;
  try {
    new URL(url);
    return url;
  } catch {
    return fallback;
  }
}

function decodeState(state: string): OAuthState {
  try {
    const decoded = atob(state);
    const parsed = JSON.parse(decoded) as Partial<OAuthState>;

    if (
      !parsed ||
      typeof parsed.user_id !== "string" ||
      typeof parsed.workspace_id !== "string" ||
      typeof parsed.credential_name !== "string" ||
      typeof parsed.provider !== "string"
    ) {
      throw new Error("Invalid state payload");
    }

    const provider = parsed.provider as OAuthProvider;
    if (!["google", "github", "slack", "notion"].includes(provider)) {
      throw new Error("Unsupported provider in state");
    }

    return {
      user_id: parsed.user_id,
      workspace_id: parsed.workspace_id,
      credential_name: parsed.credential_name,
      provider,
      credential_id:
        typeof parsed.credential_id === "string"
          ? parsed.credential_id
          : undefined,
      redirect_to:
        typeof parsed.redirect_to === "string" ? parsed.redirect_to : undefined,
    };
  } catch {
    throw new Error("Failed to decode OAuth state");
  }
}

function getProviderConfig(provider: OAuthProvider): OAuthProviderConfig {
  const redirectUri = Deno.env.get("OAUTH_CALLBACK_URL");
  if (!redirectUri) {
    throw new Error("Missing OAUTH_CALLBACK_URL");
  }

  switch (provider) {
    case "google":
      return {
        tokenEndpoint: "https://oauth2.googleapis.com/token",
        clientId: Deno.env.get("GOOGLE_CLIENT_ID") ?? "",
        clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "",
        redirectUri,
      };
    case "github":
      return {
        tokenEndpoint: "https://github.com/login/oauth/access_token",
        clientId: Deno.env.get("GITHUB_CLIENT_ID") ?? "",
        clientSecret: Deno.env.get("GITHUB_CLIENT_SECRET") ?? "",
        redirectUri,
      };
    case "slack":
      return {
        tokenEndpoint: "https://slack.com/api/oauth.v2.access",
        clientId: Deno.env.get("SLACK_CLIENT_ID") ?? "",
        clientSecret: Deno.env.get("SLACK_CLIENT_SECRET") ?? "",
        redirectUri,
      };
    case "notion":
      return {
        tokenEndpoint: "https://api.notion.com/v1/oauth/token",
        clientId: Deno.env.get("NOTION_CLIENT_ID") ?? "",
        clientSecret: Deno.env.get("NOTION_CLIENT_SECRET") ?? "",
        redirectUri,
      };
  }
}

function assertProviderConfig(config: OAuthProviderConfig): void {
  if (
    !config.clientId ||
    !config.clientSecret ||
    !config.redirectUri ||
    !config.tokenEndpoint
  ) {
    throw new Error("OAuth provider configuration is incomplete");
  }
}

async function exchangeCodeForToken(
  provider: OAuthProvider,
  config: OAuthProviderConfig,
  code: string,
): Promise<TokenResponse> {
  if (provider === "notion") {
    const basic = btoa(`${config.clientId}:${config.clientSecret}`);
    const resp = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${basic}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
      }),
    });
    return (await resp.json()) as TokenResponse;
  }

  if (provider === "github") {
    const resp = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
      }),
    });
    return (await resp.json()) as TokenResponse;
  }

  if (provider === "slack") {
    const resp = await fetch(config.tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
      }),
    });
    const raw = (await resp.json()) as Record<string, unknown>;

    // Slack shape normalization
    const ok = raw["ok"] === true;
    if (!ok) {
      return {
        error: String(raw["error"] ?? "slack_oauth_failed"),
        error_description: "Slack OAuth token exchange failed",
      };
    }

    const authedUser = raw["authed_user"] as
      | Record<string, unknown>
      | undefined;
    return {
      access_token:
        typeof raw["access_token"] === "string"
          ? raw["access_token"]
          : undefined,
      refresh_token:
        typeof raw["refresh_token"] === "string"
          ? raw["refresh_token"]
          : undefined,
      expires_in:
        typeof raw["expires_in"] === "number" ? raw["expires_in"] : undefined,
      token_type:
        typeof raw["token_type"] === "string" ? raw["token_type"] : "bearer",
      scope: typeof raw["scope"] === "string" ? raw["scope"] : undefined,
      id_token:
        typeof authedUser?.["id_token"] === "string"
          ? authedUser["id_token"]
          : undefined,
    };
  }

  // google default
  const resp = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  return (await resp.json()) as TokenResponse;
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

function computeExpiresAt(expiresIn?: number): string | null {
  if (!expiresIn || expiresIn <= 0) return null;
  const ms = Date.now() + expiresIn * 1000;
  return new Date(ms).toISOString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const encryptionKey = Deno.env.get("ENCRYPTION_KEY");
  const defaultRedirect =
    Deno.env.get("OAUTH_SUCCESS_REDIRECT_URL") ??
    "http://localhost:5173/credentials";

  if (!supabaseUrl || !serviceRoleKey || !encryptionKey) {
    return jsonResponse(
      { error: "Missing required environment variables" },
      500,
    );
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  const providerErrorDescription = url.searchParams.get("error_description");

  if (providerError) {
    const redirectUrl = new URL(
      safeUrl(defaultRedirect, "http://localhost:5173/credentials"),
    );
    redirectUrl.searchParams.set("oauth", "error");
    redirectUrl.searchParams.set("reason", providerError);
    if (providerErrorDescription) {
      redirectUrl.searchParams.set("message", providerErrorDescription);
    }
    return redirect(redirectUrl.toString());
  }

  if (!code || !stateRaw) {
    return jsonResponse({ error: "Missing code or state" }, 400);
  }

  let state: OAuthState;
  try {
    state = decodeState(stateRaw);
  } catch (err: unknown) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : "Invalid OAuth state" },
      400,
    );
  }

  const redirectTo = safeUrl(state.redirect_to, defaultRedirect);

  try {
    const providerConfig = getProviderConfig(state.provider);
    assertProviderConfig(providerConfig);

    const tokenResult = await exchangeCodeForToken(
      state.provider,
      providerConfig,
      code,
    );

    if (tokenResult.error || !tokenResult.access_token) {
      const redirectUrl = new URL(redirectTo);
      redirectUrl.searchParams.set("oauth", "error");
      redirectUrl.searchParams.set(
        "reason",
        tokenResult.error ?? "token_exchange_failed",
      );
      if (tokenResult.error_description) {
        redirectUrl.searchParams.set("message", tokenResult.error_description);
      }
      return redirect(redirectUrl.toString());
    }

    const oauthData: Record<string, unknown> = {
      provider: state.provider,
      access_token: tokenResult.access_token,
      refresh_token: tokenResult.refresh_token ?? null,
      token_type: tokenResult.token_type ?? "bearer",
      scope: tokenResult.scope ?? null,
      expires_in: tokenResult.expires_in ?? null,
      expires_at: computeExpiresAt(tokenResult.expires_in),
      id_token: tokenResult.id_token ?? null,
      obtained_at: new Date().toISOString(),
    };

    const key = await deriveKey(encryptionKey);
    const encrypted_data = await encrypt(JSON.stringify(oauthData), key);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Upsert behavior:
    // - update existing credential_id from state if present
    // - otherwise insert new credential row
    let credentialId: string | null = null;

    if (state.credential_id) {
      const { data: updated, error: updateError } = await adminClient
        .from("credentials")
        .update({
          name: state.credential_name,
          type: "oauth2",
          encrypted_data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", state.credential_id)
        .eq("user_id", state.user_id)
        .eq("workspace_id", state.workspace_id)
        .select("id")
        .single<{ id: string }>();

      if (!updateError && updated?.id) {
        credentialId = updated.id;
      }
    }

    if (!credentialId) {
      const { data: inserted, error: insertError } = await adminClient
        .from("credentials")
        .insert({
          user_id: state.user_id,
          workspace_id: state.workspace_id,
          name: state.credential_name,
          type: "oauth2",
          encrypted_data,
        })
        .select("id")
        .single<{ id: string }>();

      if (insertError || !inserted?.id) {
        throw new Error(
          insertError?.message ?? "Failed to persist OAuth credential",
        );
      }

      credentialId = inserted.id;
    }

    const successUrl = new URL(redirectTo);
    successUrl.searchParams.set("oauth", "success");
    successUrl.searchParams.set("provider", state.provider);
    successUrl.searchParams.set("credential_id", credentialId ?? "");
    return redirect(successUrl.toString());
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "OAuth callback failed";
    const errorUrl = new URL(redirectTo);
    errorUrl.searchParams.set("oauth", "error");
    errorUrl.searchParams.set("reason", "callback_failure");
    errorUrl.searchParams.set("message", errorMessage);
    return redirect(errorUrl.toString());
  }
});
