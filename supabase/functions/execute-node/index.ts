// supabase/functions/execute-node/index.ts
// Edge Function — dispatches a single node execution to the correct handler.
// Integrates OAuth2 credential auto-refresh during credential resolution.
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

import { executeHttpRequest } from "./nodes/http-request.ts";
import { executeIf } from "./nodes/if.ts";
import { executeSet } from "./nodes/set.ts";
import { executeCode } from "./nodes/code.ts";
import { executeSwitch } from "./nodes/switch.ts";
import { executeMerge } from "./nodes/merge.ts";
import { executeFunctionItem } from "./nodes/function-item.ts";
import { executeEditFields } from "./nodes/edit-fields.ts";
import { executeFilter } from "./nodes/filter.ts";
import { executeSort } from "./nodes/sort.ts";
import { executeAggregate } from "./nodes/aggregate.ts";
import { executeOpenAI } from "./nodes/openai.ts";
import { executeGemini } from "./nodes/google-gemini.ts";
import { executeSlack } from "./nodes/slack.ts";
import { executeAnthropic } from "./nodes/anthropic.ts";
import { executeGitHub } from "./nodes/github.ts";
import { executeWait } from "./nodes/wait.ts";
import type {
  CredentialData,
  NodeData,
  NodeParameters,
  NodeResult,
} from "./types.ts";
import { normalizeNodeData, normalizeParameters, ok, fail } from "./types.ts";

interface ExecuteNodeRequest {
  node_type: string;
  parameters?: unknown;
  credential_id?: string | null;
  input_data?: unknown;
  execution_id?: string;
  workflow_id?: string;
}

interface RefreshOAuthResponse {
  refreshed?: boolean;
  credential_id?: string;
  data?: Record<string, unknown>;
  expires_at?: string;
  error?: string;
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

function isTokenExpired(expiresAt: string | null, skewSeconds = 60): boolean {
  if (!expiresAt) return true;
  const ts = Date.parse(expiresAt);
  if (Number.isNaN(ts)) return true;
  return Date.now() + skewSeconds * 1000 >= ts;
}

/**
 * Fetches and decrypts credential data by calling decrypt-credential.
 * Returns null if no credential_id is provided.
 * Throws on non-2xx response.
 */
async function resolveCredential(
  credentialId: string | null | undefined,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<CredentialData> {
  if (!credentialId) return null;

  const decryptUrl = `${supabaseUrl}/functions/v1/decrypt-credential`;

  const res = await fetch(decryptUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ credential_id: credentialId }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to resolve credential (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { data?: Record<string, unknown> };
  return data.data ?? null;
}

/**
 * Auto-refresh OAuth credential if it appears expired.
 * Refresh endpoint is internal and expects service role auth.
 */
async function maybeRefreshOAuthCredential(
  credentialId: string,
  credentialData: CredentialData,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<CredentialData> {
  if (!credentialData || !isRecord(credentialData)) return credentialData;

  const accessToken = asString(
    credentialData["access_token"] ?? credentialData["token"],
  );
  const refreshToken = asString(credentialData["refresh_token"]);
  const expiresAt = asString(credentialData["expires_at"]);
  const hasOAuthSignals =
    refreshToken !== null ||
    ("token_url" in credentialData &&
      asString(credentialData["token_url"]) !== null) ||
    (asString(credentialData["provider"]) !== null &&
      asString(credentialData["provider"]) !== "apiKey");

  // Not OAuth-like credential payload
  if (!hasOAuthSignals) return credentialData;

  // If token appears healthy, no need to refresh
  if (accessToken && !isTokenExpired(expiresAt)) {
    return credentialData;
  }

  const refreshUrl = `${supabaseUrl}/functions/v1/refresh-oauth-credential`;
  const refreshResp = await fetch(refreshUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      credential_id: credentialId,
      force: false,
    }),
  });

  if (!refreshResp.ok) {
    const detail = await refreshResp.text();
    throw new Error(
      `OAuth credential refresh failed (${refreshResp.status}): ${detail}`,
    );
  }

  const payload = (await refreshResp.json()) as RefreshOAuthResponse;
  if (!payload || !isRecord(payload.data)) {
    throw new Error("OAuth refresh response missing refreshed credential data");
  }

  return payload.data;
}

async function dispatchNode(
  nodeType: string,
  parameters: NodeParameters,
  inputData: NodeData,
  credentialData: CredentialData,
): Promise<NodeResult> {
  switch (nodeType) {
    case "http-request":
      return await executeHttpRequest(parameters, inputData, credentialData);

    case "if":
      return executeIf(parameters, inputData, credentialData);

    case "set":
      return executeSet(parameters, inputData, credentialData);

    case "code":
      return await executeCode(parameters, inputData, credentialData);

    case "switch":
      return executeSwitch(parameters, inputData, credentialData);

    case "merge":
      return executeMerge(parameters, inputData, credentialData);

    case "function-item":
      return await executeFunctionItem(parameters, inputData, credentialData);

    case "edit-fields":
      return executeEditFields(parameters, inputData, credentialData);

    case "filter":
      return executeFilter(parameters, inputData, credentialData);

    case "sort":
      return executeSort(parameters, inputData, credentialData);

    case "aggregate":
      return executeAggregate(parameters, inputData, credentialData);

    case "openai":
      return await executeOpenAI(parameters, inputData, credentialData);

    case "google-gemini":
      return await executeGemini(parameters, inputData, credentialData);

    case "slack":
      return await executeSlack(parameters, inputData, credentialData);

    case "anthropic":
      return await executeAnthropic(parameters, inputData, credentialData);

    case "github":
      return await executeGitHub(parameters, inputData, credentialData);

    case "wait":
      return await executeWait(parameters, inputData);

    // Trigger nodes pass through canonical input as-is when executed directly.
    case "webhook-trigger":
    case "cron-trigger":
      return ok(inputData);

    default:
      return fail(`Unknown node type: ${nodeType}`, inputData);
  }
}

Deno.serve(async (req: Request) => {
  try {
    const options = handleOptions(req);
    if (options) return options;

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { error: "Missing required environment variables" },
      500,
    );
  }

  // Auth check — only service_role is allowed
  const authHeader = req.headers.get("Authorization") ?? "";
  const apiKeyHeader = req.headers.get("apikey") ?? "";
  const authToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  const apiToken = apiKeyHeader.trim();
  const expected = serviceRoleKey.trim();

  if (authToken !== expected && apiToken !== expected) {
    console.error(`Unauthorized. AuthHeader: ${!!authHeader}, APIKeyHeader: ${!!apiKeyHeader}`);
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: ExecuteNodeRequest;
  try {
    body = (await req.json()) as ExecuteNodeRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const nodeType = body.node_type;
  if (!nodeType) {
    return jsonResponse({ error: "node_type is required" }, 400);
  }

  const parameters = normalizeParameters(body.parameters);
  const inputData = normalizeNodeData(body.input_data);

  let credentialData: CredentialData = null;
  try {
    credentialData = await resolveCredential(
      body.credential_id,
      supabaseUrl,
      serviceRoleKey,
    );

    // OAuth auto-refresh integration
    if (body.credential_id && credentialData) {
      credentialData = await maybeRefreshOAuthCredential(
        body.credential_id,
        credentialData,
        supabaseUrl,
        serviceRoleKey,
      );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ output: inputData, error: message, branch: null });
  }

  let result: NodeResult;
  try {
    result = await dispatchNode(
      nodeType,
      parameters,
      inputData,
      credentialData,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    result = fail(message, inputData);
  }

  const normalizedOutput = normalizeNodeData(result.output);

  return jsonResponse({
    output: normalizedOutput,
    error: result.error ?? null,
    branch: result.branch ?? null,
  });
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Critical error in execute-node:", error.message);
    return jsonResponse({
      error: `Internal Executor Error: ${error.message}`,
      stack: error.stack
    }, 500);
  }
});
