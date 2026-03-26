// supabase/functions/webhook-receiver/index.ts
// Public Edge Function — receives inbound HTTP requests and triggers a workflow.
//
// URL pattern (configured in workflow's webhook-trigger node):
//   POST /functions/v1/webhook-receiver?path=<webhook-path>
//
// Flow:
//   1. Extract the webhook path from the query string
//   2. Find the matching active workflow that has a webhook-trigger node with that path
//   3. Forward the request body + headers as initial_data to execute-workflow
//   4. Return immediately with { received: true } — execution is async

import { createClient } from "npm:@supabase/supabase-js@2";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkflowNode {
  id: string;
  type: string;
  parameters: Record<string, unknown>;
}

interface WorkflowRow {
  id: string;
  nodes: WorkflowNode[];
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

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Environment ──────────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const executeWorkflowUrl = Deno.env.get("EXECUTE_WORKFLOW_URL");

  if (!supabaseUrl || !serviceRoleKey || !executeWorkflowUrl) {
    return jsonResponse({ error: "Missing required environment variables" }, 500);
  }

  // ── Extract webhook path ──────────────────────────────────────────────────
  const url = new URL(req.url);
  const webhookPath = url.searchParams.get("path");

  if (!webhookPath) {
    return jsonResponse({ error: "Missing 'path' query parameter" }, 400);
  }

  // ── Parse incoming body ───────────────────────────────────────────────────
  let body: unknown = null;
  const contentType = req.headers.get("content-type") ?? "";

  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      if (contentType.includes("application/json")) {
        body = await req.json();
      } else {
        body = await req.text();
      }
    } catch {
      body = null;
    }
  }

  // Capture inbound headers as a plain object (exclude sensitive ones)
  const inboundHeaders: Record<string, string> = {};
  for (const [key, value] of req.headers.entries()) {
    if (key.toLowerCase() !== "authorization") {
      inboundHeaders[key] = value;
    }
  }

  const initialData = {
    method: req.method,
    path: webhookPath,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: inboundHeaders,
    body,
  };

  // ── Find matching workflow ────────────────────────────────────────────────
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch all active workflows — we filter by node parameters in application code
  // because JSONB array queries are complex; the active index keeps this fast.
  const { data: workflows, error: fetchError } = await adminClient
    .from("workflows")
    .select("id, nodes")
    .eq("active", true);

  if (fetchError) {
    return jsonResponse({ error: "Failed to query workflows" }, 500);
  }

  // Find a workflow whose webhook-trigger node matches the requested path + method
  let matchedWorkflowId: string | null = null;

  for (const workflow of (workflows ?? []) as WorkflowRow[]) {
    for (const node of workflow.nodes) {
      if (node.type !== "webhook-trigger") continue;
      const nodePath = node.parameters["path"] as string | undefined;
      const nodeMethod = (node.parameters["method"] as string | undefined) ?? "POST";

      if (
        nodePath === webhookPath &&
        nodeMethod.toUpperCase() === req.method.toUpperCase()
      ) {
        matchedWorkflowId = workflow.id;
        break;
      }
    }
    if (matchedWorkflowId) break;
  }

  if (!matchedWorkflowId) {
    return jsonResponse(
      { error: `No active workflow found for webhook path '${webhookPath}' with method ${req.method}` },
      404
    );
  }

  // ── Trigger execute-workflow (fire-and-forget) ────────────────────────────
  // We do NOT await the execution — webhooks should respond immediately.
  // The actual run happens asynchronously and the caller can poll executions.
  const triggerPayload = {
    workflow_id: matchedWorkflowId,
    triggered_by: "webhook",
    initial_data: initialData,
  };

  // Fire and forget — use waitUntil so Deno doesn't terminate the execution early
  const executionPromise = fetch(executeWorkflowUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(triggerPayload),
  }).catch((err: unknown) => {
    console.error(
      "[webhook-receiver] Failed to trigger execute-workflow:",
      err instanceof Error ? err.message : String(err)
    );
  });

  // Use EdgeRuntime.waitUntil if available (Supabase edge runtime)
  // to keep the process alive until the fetch resolves
  if (typeof (globalThis as Record<string, unknown>)["EdgeRuntime"] !== "undefined") {
    const edgeRuntime = (globalThis as Record<string, unknown>)["EdgeRuntime"] as {
      waitUntil?: (p: Promise<unknown>) => void;
    };
    edgeRuntime.waitUntil?.(executionPromise);
  }

  // ── Respond immediately ───────────────────────────────────────────────────
  return jsonResponse({
    received: true,
    workflow_id: matchedWorkflowId,
    webhook_path: webhookPath,
  });
});
