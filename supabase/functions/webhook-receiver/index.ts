// supabase/functions/webhook-receiver/index.ts
// Public Edge Function — receives inbound webhook requests and triggers a workflow.
//
// Hardening included:
// 1) Path normalization + strict matching
// 2) Optional webhook secret validation per node
// 3) Stricter method matching and safer input capture
//
// URL pattern:
//   /functions/v1/webhook-receiver?path=<webhook-path>
// or (fallback):
//   /functions/v1/webhook-receiver/<webhook-path>
//
// Trigger payload sent to execute-workflow:
// {
//   workflow_id: string,
//   triggered_by: "webhook",
//   initial_data: {
//     method, path, query, headers, body, metadata
//   }
// }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface WorkflowNode {
  id: string;
  type: string;
  parameters: Record<string, unknown>;
}

interface WorkflowRow {
  id: string;
  user_id: string;
  active: boolean;
  nodes: WorkflowNode[];
}

interface WebhookNodeConfig {
  path: string;
  method: string;
  secret?: string;
  secret_header?: string;
  secret_query_param?: string;
}

interface ParsedIncomingBody {
  raw: string | null;
  parsed: unknown;
  contentType: string;
}

interface TriggerPayload {
  workflow_id: string;
  triggered_by: "webhook";
  initial_data: {
    method: string;
    path: string;
    query: Record<string, string>;
    headers: Record<string, string>;
    body: unknown;
    metadata: {
      received_at: string;
      source_ip?: string;
      user_agent?: string;
      content_type?: string;
      content_length?: string;
    };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants / helpers
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
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

function normalizeMethod(method: string): string {
  return method.trim().toUpperCase();
}

function normalizePath(rawPath: string): string {
  // decode + trim + enforce leading slash + collapse duplicate slashes + remove trailing slash (except root)
  const decoded = decodeURIComponent(rawPath).trim();
  const withLeading = decoded.startsWith("/") ? decoded : `/${decoded}`;
  const collapsed = withLeading.replace(/\/{2,}/g, "/");
  if (collapsed.length > 1 && collapsed.endsWith("/"))
    return collapsed.slice(0, -1);
  return collapsed;
}

function sanitizeHeaderMap(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    const lower = key.toLowerCase();

    // Keep auth out of execution payload/log chain
    if (
      lower === "authorization" ||
      lower === "cookie" ||
      lower === "set-cookie"
    )
      continue;

    out[lower] = value;
  }
  return out;
}

function getQueryObject(url: URL): Record<string, string> {
  const query: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) {
    query[k] = v;
  }
  return query;
}

async function parseIncomingBody(req: Request): Promise<ParsedIncomingBody> {
  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();

  if (req.method === "GET" || req.method === "HEAD") {
    return { raw: null, parsed: null, contentType };
  }

  let raw: string | null = null;
  try {
    raw = await req.text();
  } catch {
    raw = null;
  }

  if (raw === null || raw.length === 0) {
    return { raw, parsed: null, contentType };
  }

  if (contentType.includes("application/json")) {
    try {
      return {
        raw,
        parsed: JSON.parse(raw),
        contentType,
      };
    } catch {
      // Keep raw text if invalid JSON
      return {
        raw,
        parsed: raw,
        contentType,
      };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const obj: Record<string, string> = {};
    for (const [k, v] of params.entries()) obj[k] = v;
    return { raw, parsed: obj, contentType };
  }

  return { raw, parsed: raw, contentType };
}

function extractPathFromRequest(url: URL): string | null {
  // Preferred: ?path=/foo/bar
  const fromQuery = url.searchParams.get("path");
  if (fromQuery && fromQuery.trim().length > 0) {
    return normalizePath(fromQuery);
  }

  // Fallback: /functions/v1/webhook-receiver/<path>
  const marker = "/functions/v1/webhook-receiver";
  const idx = url.pathname.indexOf(marker);
  if (idx >= 0) {
    const suffix = url.pathname.slice(idx + marker.length);
    if (suffix && suffix !== "/") return normalizePath(suffix);
  }

  return null;
}

function parseWebhookNodeConfig(node: WorkflowNode): WebhookNodeConfig | null {
  if (node.type !== "webhook-trigger") return null;
  if (!isRecord(node.parameters)) return null;

  const p = node.parameters;
  const path = typeof p["path"] === "string" ? p["path"] : "";
  const method = typeof p["method"] === "string" ? p["method"] : "POST";
  const secret = typeof p["secret"] === "string" ? p["secret"] : undefined;
  const secretHeader =
    typeof p["secret_header"] === "string" ? p["secret_header"] : undefined;
  const secretQueryParam =
    typeof p["secret_query_param"] === "string"
      ? p["secret_query_param"]
      : undefined;

  if (!path.trim()) return null;

  return {
    path: normalizePath(path),
    method: normalizeMethod(method || "POST"),
    ...(secret && secret.length > 0 ? { secret } : {}),
    ...(secretHeader && secretHeader.length > 0
      ? { secret_header: secretHeader.toLowerCase() }
      : {}),
    ...(secretQueryParam && secretQueryParam.length > 0
      ? { secret_query_param: secretQueryParam }
      : {}),
  };
}

function resolveExpectedSecret(config: WebhookNodeConfig): string | null {
  return config.secret && config.secret.length > 0 ? config.secret : null;
}

function validateSecret(
  config: WebhookNodeConfig,
  reqUrl: URL,
  reqHeaders: Headers,
): { ok: boolean; reason?: string } {
  const expected = resolveExpectedSecret(config);
  if (!expected) {
    // Secret not configured => skip secret validation
    return { ok: true };
  }

  const headerName = (config.secret_header ?? "x-webhook-secret").toLowerCase();
  const queryKey = config.secret_query_param ?? "secret";

  const providedHeader = reqHeaders.get(headerName);
  const providedQuery = reqUrl.searchParams.get(queryKey);

  const provided = providedHeader ?? providedQuery ?? null;
  if (!provided) {
    return { ok: false, reason: "Missing webhook secret" };
  }

  // constant-time-ish compare for equal-length strings
  if (provided.length !== expected.length) {
    return { ok: false, reason: "Invalid webhook secret" };
  }

  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  if (diff !== 0) {
    return { ok: false, reason: "Invalid webhook secret" };
  }

  return { ok: true };
}

function buildInitialData(
  req: Request,
  path: string,
  parsedBody: ParsedIncomingBody,
): TriggerPayload["initial_data"] {
  const url = new URL(req.url);

  return {
    method: normalizeMethod(req.method),
    path,
    query: getQueryObject(url),
    headers: sanitizeHeaderMap(req.headers),
    body: parsedBody.parsed,
    metadata: {
      received_at: new Date().toISOString(),
      source_ip: req.headers.get("x-forwarded-for") ?? undefined,
      user_agent: req.headers.get("user-agent") ?? undefined,
      content_type: req.headers.get("content-type") ?? undefined,
      content_length: req.headers.get("content-length") ?? undefined,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const options = handleOptions(req);
  if (options) return options;

  const method = normalizeMethod(req.method);
  if (!ALLOWED_METHODS.has(method)) {
    return jsonResponse({ error: `Method ${method} not allowed` }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const executeWorkflowUrl = Deno.env.get("EXECUTE_WORKFLOW_URL");

  if (!supabaseUrl || !serviceRoleKey || !executeWorkflowUrl) {
    return jsonResponse(
      { error: "Missing required environment variables" },
      500,
    );
  }

  const url = new URL(req.url);
  const normalizedRequestedPath = extractPathFromRequest(url);
  if (!normalizedRequestedPath) {
    return jsonResponse(
      {
        error:
          "Missing webhook path. Provide ?path=<path> or /webhook-receiver/<path>",
      },
      400,
    );
  }

  const parsedBody = await parseIncomingBody(req);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: workflows, error: wfError } = await adminClient
    .from("workflows")
    .select("id, user_id, active, nodes")
    .eq("active", true);

  if (wfError) {
    return jsonResponse({ error: "Failed to query workflows" }, 500);
  }

  // Strict match strategy:
  // - path exact after normalization
  // - method exact (uppercased)
  // - optional secret validation
  let matchedWorkflowId: string | null = null;
  let matchedNodeId: string | null = null;

  for (const workflow of (workflows ?? []) as WorkflowRow[]) {
    for (const node of workflow.nodes ?? []) {
      const config = parseWebhookNodeConfig(node);
      if (!config) continue;

      if (config.path !== normalizedRequestedPath) continue;
      if (config.method !== method) continue;

      const secretCheck = validateSecret(config, url, req.headers);
      if (!secretCheck.ok) {
        // Path/method matched but secret failed => explicit unauthorized
        return jsonResponse(
          {
            error: "Unauthorized webhook request",
            detail: secretCheck.reason ?? "Secret validation failed",
          },
          401,
        );
      }

      matchedWorkflowId = workflow.id;
      matchedNodeId = node.id;
      break;
    }

    if (matchedWorkflowId) break;
  }

  if (!matchedWorkflowId) {
    return jsonResponse(
      {
        error: `No active webhook found for path '${normalizedRequestedPath}' and method ${method}`,
      },
      404,
    );
  }

  const initialData = buildInitialData(
    req,
    normalizedRequestedPath,
    parsedBody,
  );

  const triggerPayload: TriggerPayload = {
    workflow_id: matchedWorkflowId,
    triggered_by: "webhook",
    initial_data: initialData,
  };

  // include matched node id for downstream observability
  if (isRecord(triggerPayload.initial_data.metadata)) {
    (triggerPayload.initial_data.metadata as Record<string, unknown>)[
      "matched_node_id"
    ] = matchedNodeId;
  }

  // Fire-and-forget workflow execution
  const executionPromise = fetch(executeWorkflowUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(triggerPayload),
  }).catch((err: unknown) => {
    console.error(
      "[webhook-receiver] Failed to trigger execute-workflow:",
      err instanceof Error ? err.message : String(err),
    );
  });

  // Keep runtime alive if supported
  const edgeRuntime = (globalThis as Record<string, unknown>)["EdgeRuntime"] as
    | { waitUntil?: (p: Promise<unknown>) => void }
    | undefined;
  edgeRuntime?.waitUntil?.(executionPromise);

  return jsonResponse({
    received: true,
    workflow_id: matchedWorkflowId,
    node_id: matchedNodeId,
    webhook_path: normalizedRequestedPath,
    method,
  });
});
