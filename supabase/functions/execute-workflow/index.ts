// supabase/functions/execute-workflow/index.ts
// Edge Function — orchestrates a full workflow execution run.
//
// Flow:
//   1. Validate request + auth
//   2. Fetch workflow from DB
//   3. Insert an `executions` record (status = running)
//   4. Topologically sort nodes (respects connection order)
//   5. For each node (in order): POST to execute-node, write execution_log
//   6. On completion/error: update executions.status + finished_at

import { createClient } from "npm:@supabase/supabase-js@2";

// ─── Types (inlined to avoid Deno/npm resolution issues) ─────────────────────

interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  parameters: Record<string, unknown>;
  credential_id?: string;
}

interface WorkflowConnection {
  source_node_id: string;
  source_output: string;
  target_node_id: string;
  target_input: string;
}

interface WorkflowSettings {
  timezone: string;
  error_workflow_id?: string;
  save_execution_progress: boolean;
  max_retries: number;
}

interface Workflow {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  settings: WorkflowSettings;
}

type ExecutionTrigger = "manual" | "webhook" | "cron";

interface ExecuteWorkflowRequest {
  workflow_id: string;
  triggered_by?: ExecutionTrigger;
  initial_data?: Record<string, unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
 * Topological sort (Kahn's algorithm).
 * Returns nodes ordered so that every dependency comes before its dependents.
 * Trigger nodes (no incoming connections) always come first.
 */
function topologicalSort(
  nodes: WorkflowNode[],
  connections: WorkflowConnection[]
): WorkflowNode[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>(); // nodeId -> [dependents]

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const conn of connections) {
    inDegree.set(conn.target_node_id, (inDegree.get(conn.target_node_id) ?? 0) + 1);
    adjacency.get(conn.source_node_id)?.push(conn.target_node_id);
  }

  // Start with nodes that have no incoming edges (triggers)
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbour of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbour) ?? 1) - 1;
      inDegree.set(neighbour, newDegree);
      if (newDegree === 0) queue.push(neighbour);
    }
  }

  // Map back to node objects, preserving order
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return sorted.map((id) => nodeMap.get(id)!).filter(Boolean);
}

/**
 * Given a node id and the full connection list, find the output
 * data of the source node that feeds into this node.
 */
function getInputForNode(
  nodeId: string,
  connections: WorkflowConnection[],
  nodeOutputs: Map<string, unknown>
): unknown {
  const incomingConns = connections.filter((c) => c.target_node_id === nodeId);
  if (incomingConns.length === 0) return null;

  // For now: merge all incoming outputs into an array
  const inputs = incomingConns.map((c) => nodeOutputs.get(c.source_node_id) ?? null);
  return inputs.length === 1 ? inputs[0] : inputs;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only POST is accepted
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // ── Environment ──────────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const executeNodeUrl = Deno.env.get("EXECUTE_NODE_URL"); // URL of execute-node function

  if (!supabaseUrl || !serviceRoleKey || !executeNodeUrl) {
    return jsonResponse({ error: "Missing required environment variables" }, 500);
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  // Accept either a user JWT (manual trigger from frontend) or service_role
  // key (cron / webhook triggers). Both get a service_role admin client for DB writes.
  const authHeader = req.headers.get("Authorization");
  let userId: string | null = null;

  if (authHeader) {
    // Verify the JWT to get the user id
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error } = await anonClient.auth.getUser();
    if (!error && user) userId = user.id;
  }

  // Service role client — bypasses RLS, used for all DB writes
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: ExecuteWorkflowRequest;
  try {
    body = await req.json() as ExecuteWorkflowRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { workflow_id, triggered_by = "manual", initial_data = {} } = body;

  if (!workflow_id) {
    return jsonResponse({ error: "workflow_id is required" }, 400);
  }

  // ── Fetch workflow ────────────────────────────────────────────────────────
  const { data: workflow, error: wfError } = await adminClient
    .from("workflows")
    .select("*")
    .eq("id", workflow_id)
    .single<Workflow>();

  if (wfError || !workflow) {
    return jsonResponse({ error: "Workflow not found" }, 404);
  }

  // Resolve user_id: from JWT if available, otherwise from workflow owner
  const effectiveUserId = userId ?? workflow.user_id;

  // ── Create execution record ───────────────────────────────────────────────
  const { data: execution, error: execError } = await adminClient
    .from("executions")
    .insert({
      workflow_id: workflow.id,
      user_id: effectiveUserId,
      status: "running",
      triggered_by,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single<{ id: string }>();

  if (execError || !execution) {
    return jsonResponse({ error: "Failed to create execution record", detail: execError?.message }, 500);
  }

  const executionId = execution.id;

  // ── Sort nodes topologically ──────────────────────────────────────────────
  const orderedNodes = topologicalSort(workflow.nodes, workflow.connections);

  if (orderedNodes.length === 0) {
    await adminClient
      .from("executions")
      .update({ status: "success", finished_at: new Date().toISOString() })
      .eq("id", executionId);
    return jsonResponse({ execution_id: executionId, status: "success", message: "No nodes to execute" });
  }

  // ── Execute nodes ─────────────────────────────────────────────────────────
  // Map of nodeId -> output data so downstream nodes can access upstream results
  const nodeOutputs = new Map<string, unknown>();
  // Seed the first node(s) with initial_data
  for (const node of orderedNodes) {
    const incoming = workflow.connections.filter((c) => c.target_node_id === node.id);
    if (incoming.length === 0) {
      nodeOutputs.set(node.id + "__initial", initial_data);
    }
  }

  let executionFailed = false;
  let lastError: string | undefined;

  for (const node of orderedNodes) {
    const nodeStartedAt = new Date().toISOString();
    const inputData = getInputForNode(node.id, workflow.connections, nodeOutputs) ?? initial_data;

    // ── Insert pending log ──────────────────────────────────────────────────
    const { data: logRecord } = await adminClient
      .from("execution_logs")
      .insert({
        execution_id: executionId,
        node_id: node.id,
        node_name: node.name,
        status: "running",
        input_data: inputData,
        started_at: nodeStartedAt,
      })
      .select("id")
      .single<{ id: string }>();

    const logId = logRecord?.id;

    // ── Call execute-node function ──────────────────────────────────────────
    let outputData: unknown = null;
    let nodeError: string | undefined;
    let nodeStatus: "success" | "error" = "success";
    const nodeCallStart = Date.now();

    try {
      const nodeResponse = await fetch(executeNodeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          node_type: node.type,
          parameters: node.parameters,
          credential_id: node.credential_id,
          input_data: inputData,
          execution_id: executionId,
          workflow_id: workflow.id,
        }),
      });

      if (!nodeResponse.ok) {
        const errBody = await nodeResponse.text();
        throw new Error(`execute-node responded ${nodeResponse.status}: ${errBody}`);
      }

      const result = await nodeResponse.json() as { output: unknown; error?: string };

      if (result.error) {
        nodeStatus = "error";
        nodeError = result.error;
        executionFailed = true;
        lastError = result.error;
      } else {
        outputData = result.output;
        nodeOutputs.set(node.id, outputData);
      }
    } catch (err: unknown) {
      nodeStatus = "error";
      nodeError = err instanceof Error ? err.message : String(err);
      executionFailed = true;
      lastError = nodeError;
    }

    const nodeFinishedAt = new Date().toISOString();
    const durationMs = Date.now() - nodeCallStart;

    // ── Update execution log ────────────────────────────────────────────────
    if (logId) {
      await adminClient
        .from("execution_logs")
        .update({
          status: nodeStatus,
          output_data: outputData,
          error: nodeError ?? null,
          finished_at: nodeFinishedAt,
          duration_ms: durationMs,
        })
        .eq("id", logId);
    }

    // Stop processing on error (unless workflow settings say otherwise)
    if (executionFailed) break;
  }

  // ── Finalise execution record ─────────────────────────────────────────────
  const finalStatus = executionFailed ? "error" : "success";
  await adminClient
    .from("executions")
    .update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      error: lastError ?? null,
    })
    .eq("id", executionId);

  return jsonResponse({
    execution_id: executionId,
    status: finalStatus,
    ...(lastError ? { error: lastError } : {}),
  });
});
