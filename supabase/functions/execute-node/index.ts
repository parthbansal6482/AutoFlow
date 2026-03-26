// supabase/functions/execute-node/index.ts
// Edge Function — dispatches a single node execution to the correct handler.
//
// Called by execute-workflow for each node in the graph.
// Request body:
//   {
//     node_type:     string        — matches node registry (http-request, if, set, code, etc.)
//     parameters:    object        — node's configured parameters
//     credential_id: string | null — credential to decrypt and inject
//     input_data:    unknown       — output from the upstream node
//     execution_id:  string        — for logging context
//     workflow_id:   string        — for logging context
//   }
//
// Response:
//   { output: unknown }            on success
//   { output: null, error: string } on failure

import { createClient } from "npm:@supabase/supabase-js@2";
import { executeHttpRequest } from "./nodes/http-request.ts";
import { executeIf } from "./nodes/if.ts";
import { executeSet } from "./nodes/set.ts";
import { executeCode } from "./nodes/code.ts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExecuteNodeRequest {
  node_type: string;
  parameters: Record<string, unknown>;
  credential_id?: string | null;
  input_data: unknown;
  execution_id: string;
  workflow_id: string;
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

/**
 * Fetches and decrypts credential data by calling the decrypt-credential function.
 * Returns null if no credential_id is provided or on failure.
 */
async function resolveCredential(
  credentialId: string | null | undefined,
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<Record<string, unknown> | null> {
  if (!credentialId) return null;

  const decryptUrl = `${supabaseUrl}/functions/v1/decrypt-credential`;

  try {
    const res = await fetch(decryptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ credential_id: credentialId }),
    });

    if (!res.ok) return null;

    const data = await res.json() as { data?: Record<string, unknown> };
    return data.data ?? null;
  } catch {
    return null;
  }
}

// ─── Node dispatcher ──────────────────────────────────────────────────────────

async function dispatchNode(
  nodeType: string,
  parameters: Record<string, unknown>,
  inputData: unknown,
  credentialData: Record<string, unknown> | null
): Promise<{ output: unknown; error?: string; branch?: string }> {
  switch (nodeType) {
    case "http-request":
      return await executeHttpRequest(parameters, inputData, credentialData);

    case "if": {
      const result = executeIf(parameters, inputData, credentialData);
      return result;
    }

    case "set":
      return executeSet(parameters, inputData, credentialData);

    case "code":
      return await executeCode(parameters, inputData, credentialData);

    // Trigger nodes — when executed directly (e.g. manual test), just pass through
    case "webhook-trigger":
    case "cron-trigger":
      return { output: inputData };

    default:
      return { output: null, error: `Unknown node type: ${nodeType}` };
  }
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

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing required environment variables" }, 500);
  }

  // ── Auth check — only service_role can call this function ────────────────
  // execute-workflow always passes its service_role key
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (token !== serviceRoleKey) {
    // Allow calls that use the anon key from the Supabase dashboard invoke
    // (authenticated users can call this during local dev / testing)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await adminClient.auth.getUser(token);
    if (error) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: ExecuteNodeRequest;
  try {
    body = await req.json() as ExecuteNodeRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { node_type, parameters, credential_id, input_data } = body;

  if (!node_type) {
    return jsonResponse({ error: "node_type is required" }, 400);
  }

  // ── Resolve credential ────────────────────────────────────────────────────
  const credentialData = await resolveCredential(credential_id, supabaseUrl, serviceRoleKey);

  // ── Dispatch ──────────────────────────────────────────────────────────────
  const result = await dispatchNode(node_type, parameters ?? {}, input_data, credentialData);

  // ── Return result ─────────────────────────────────────────────────────────
  if (result.error) {
    return jsonResponse({ output: null, error: result.error });
  }

  return jsonResponse({ output: result.output, branch: result.branch ?? null });
});
