// supabase/functions/execute-workflow/index.ts
// Edge Function — orchestrates full workflow execution with:
// - canonical NodeData contract
// - branch-aware connection traversal queue
// - per-node execution logs
// - workflow-level retries based on settings.max_retries
//
// Request body:
// {
//   workflow_id: string,
//   triggered_by?: "manual" | "webhook" | "cron",
//   initial_data?: unknown
// }

import { createClient } from "npm:@supabase/supabase-js@2";

type ExecutionTrigger = "manual" | "webhook" | "cron";
type ExecutionStatus =
  | "pending"
  | "running"
  | "success"
  | "error"
  | "cancelled";

interface NodeDataItem {
  json: Record<string, unknown>;
  binary?: Record<
    string,
    {
      data: string;
      mimeType?: string;
      fileName?: string;
    }
  >;
}
type NodeData = NodeDataItem[];

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
  timezone?: string;
  error_workflow_id?: string;
  save_execution_progress?: boolean;
  max_retries?: number;
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

interface ExecuteWorkflowRequest {
  workflow_id: string;
  triggered_by?: ExecutionTrigger;
  initial_data?: unknown;
}

interface ExecuteNodeResponse {
  output: unknown;
  error?: string | null;
  branch?: string | null;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeDataItem(value: unknown): value is NodeDataItem {
  return (
    isRecord(value) &&
    "json" in value &&
    isRecord((value as Record<string, unknown>).json)
  );
}

function isNodeData(value: unknown): value is NodeData {
  return Array.isArray(value) && value.every(isNodeDataItem);
}

function normalizeNodeData(input: unknown): NodeData {
  if (isNodeData(input)) return input;

  if (Array.isArray(input)) {
    return input.map((item) => {
      if (isNodeDataItem(item)) return item;
      if (isRecord(item)) return { json: item };
      return { json: { value: item } };
    });
  }

  if (isRecord(input)) {
    if ("json" in input && isRecord(input.json)) {
      const normalized: NodeDataItem = { json: input.json };
      if ("binary" in input && isRecord(input.binary)) {
        normalized.binary = input.binary as NodeDataItem["binary"];
      }
      return [normalized];
    }
    return [{ json: input }];
  }

  return [{ json: { value: input ?? null } }];
}

function groupOutgoingConnections(
  connections: WorkflowConnection[],
): Map<string, WorkflowConnection[]> {
  const map = new Map<string, WorkflowConnection[]>();
  for (const c of connections) {
    const arr = map.get(c.source_node_id) ?? [];
    arr.push(c);
    map.set(c.source_node_id, arr);
  }
  return map;
}

function buildNodeMap(nodes: WorkflowNode[]): Map<string, WorkflowNode> {
  return new Map(nodes.map((n) => [n.id, n]));
}

function findTriggerNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.filter(
    (n) => n.type === "webhook-trigger" || n.type === "cron-trigger",
  );
}

function sanitizeRetryCount(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 10) return 10;
  return Math.floor(value);
}

interface QueueItem {
  nodeId: string;
  inputData: NodeData;
  viaPort: string;
}

interface NodeRunContext {
  executionId: string;
  attempt: number;
  node: WorkflowNode;
  inputData: NodeData;
}

async function insertRunningNodeLog(
  adminClient: ReturnType<typeof createClient>,
  ctx: NodeRunContext,
): Promise<string | null> {
  const { data, error } = await adminClient
    .from("execution_logs")
    .insert({
      execution_id: ctx.executionId,
      node_id: ctx.node.id,
      node_name: ctx.node.name,
      status: "running" satisfies ExecutionStatus,
      input_data: ctx.inputData,
      started_at: new Date().toISOString(),
      error: null,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) return null;
  return data.id;
}

async function finishNodeLog(
  adminClient: ReturnType<typeof createClient>,
  logId: string | null,
  payload: {
    status: "success" | "error";
    outputData: NodeData;
    error?: string;
    durationMs: number;
  },
): Promise<void> {
  if (!logId) return;

  await adminClient
    .from("execution_logs")
    .update({
      status: payload.status,
      output_data: payload.outputData,
      error: payload.error ?? null,
      finished_at: new Date().toISOString(),
      duration_ms: payload.durationMs,
    })
    .eq("id", logId);
}

async function runSingleNode(
  executeNodeUrl: string,
  serviceRoleKey: string,
  workflowId: string,
  executionId: string,
  node: WorkflowNode,
  inputData: NodeData,
): Promise<{
  output: NodeData;
  error?: string;
  branch?: string | null;
}> {
  const resp = await fetch(executeNodeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      node_type: node.type,
      parameters: node.parameters,
      credential_id: node.credential_id ?? null,
      input_data: inputData,
      execution_id: executionId,
      workflow_id: workflowId,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    return {
      output: inputData,
      error: `execute-node HTTP ${resp.status}: ${txt}`,
      branch: null,
    };
  }

  const data = (await resp.json()) as ExecuteNodeResponse;
  const output = normalizeNodeData(data.output);
  const error =
    typeof data.error === "string" && data.error.length > 0
      ? data.error
      : undefined;
  const branch = typeof data.branch === "string" ? data.branch : null;

  return { output, ...(error ? { error } : {}), branch };
}

function selectNextConnections(
  outgoing: WorkflowConnection[],
  branch: string | null | undefined,
  hasError: boolean,
): WorkflowConnection[] {
  if (hasError) {
    const errorEdges = outgoing.filter((c) => c.source_output === "error");
    if (errorEdges.length > 0) return errorEdges;
    return [];
  }

  if (branch) {
    const branchEdges = outgoing.filter((c) => c.source_output === branch);
    if (branchEdges.length > 0) return branchEdges;
  }

  const mainEdges = outgoing.filter((c) => c.source_output === "main");
  if (mainEdges.length > 0) return mainEdges;

  // Fallback: if node uses custom output names and returned no branch,
  // continue all non-error edges.
  return outgoing.filter((c) => c.source_output !== "error");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const executeNodeUrl = Deno.env.get("EXECUTE_NODE_URL");

  if (!supabaseUrl || !serviceRoleKey || !executeNodeUrl) {
    return jsonResponse(
      { error: "Missing required environment variables" },
      500,
    );
  }

  // Resolve caller user — the frontend sends the user JWT in x-user-token
  // (Authorization carries the publishable key for edge runtime auth).
  // Fall back to Authorization for service-triggered calls (webhook/cron).
  const authHeader =
    req.headers.get("x-user-token")
      ? `Bearer ${req.headers.get("x-user-token")}`
      : req.headers.get("Authorization");
  let callerUserId: string | null = null;

  if (authHeader) {
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (anonKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error } = await userClient.auth.getUser();
      if (!error && userData.user) {
        callerUserId = userData.user.id;
      }
    }
  }

  let body: ExecuteWorkflowRequest;
  try {
    body = (await req.json()) as ExecuteWorkflowRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const workflowId = body.workflow_id;
  if (!workflowId) {
    return jsonResponse({ error: "workflow_id is required" }, 400);
  }

  const triggeredBy: ExecutionTrigger = body.triggered_by ?? "manual";
  const initialData = normalizeNodeData(body.initial_data);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: workflow, error: wfError } = await adminClient
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .single<Workflow>();

  if (wfError || !workflow) {
    return jsonResponse({ error: "Workflow not found" }, 404);
  }

  // Ownership check for user-triggered manual runs.
  if (
    callerUserId &&
    triggeredBy === "manual" &&
    workflow.user_id !== callerUserId
  ) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // For webhook/cron execution, enforce active workflow.
  if (
    (triggeredBy === "webhook" || triggeredBy === "cron") &&
    !workflow.active
  ) {
    return jsonResponse(
      { error: "Workflow is inactive and cannot be executed by this trigger" },
      409,
    );
  }

  const maxRetries = sanitizeRetryCount(workflow.settings?.max_retries ?? 0);

  const { data: executionRow, error: executionInsertError } = await adminClient
    .from("executions")
    .insert({
      workflow_id: workflow.id,
      user_id: workflow.user_id,
      status: "running" satisfies ExecutionStatus,
      triggered_by: triggeredBy,
      started_at: new Date().toISOString(),
      error: null,
    })
    .select("id")
    .single<{ id: string }>();

  if (executionInsertError || !executionRow) {
    return jsonResponse(
      {
        error: "Failed to create execution record",
        detail: executionInsertError?.message ?? null,
      },
      500,
    );
  }

  const executionId = executionRow.id;
  const nodeMap = buildNodeMap(workflow.nodes);
  const outgoingMap = groupOutgoingConnections(workflow.connections);

  const triggerNodes = findTriggerNodes(workflow.nodes);

  // Fallback: if no explicit trigger nodes are present, start from graph roots
  const roots = workflow.nodes.filter((n: WorkflowNode) => {
    const hasIncoming = workflow.connections.some(
      (c: WorkflowConnection) => c.target_node_id === n.id,
    );
    return !hasIncoming;
  });

  const startingNodes = triggerNodes.length > 0 ? triggerNodes : roots;

  if (startingNodes.length === 0) {
    await adminClient
      .from("executions")
      .update({
        status: "success" satisfies ExecutionStatus,
        finished_at: new Date().toISOString(),
        error: null,
      })
      .eq("id", executionId);

    return jsonResponse({
      execution_id: executionId,
      status: "success",
      message: "No executable start nodes found",
    });
  }

  let executionFailed = false;
  let lastError: string | undefined;

  // Retry from scratch when a run-level failure occurs and retries remain.
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    executionFailed = false;
    lastError = undefined;

    const queue: QueueItem[] = startingNodes.map((n: WorkflowNode) => ({
      nodeId: n.id,
      inputData: initialData,
      viaPort: "main",
    }));

    // Guards against accidental infinite loops.
    const maxSteps = Math.max(1000, workflow.nodes.length * 100);
    let steps = 0;

    while (queue.length > 0) {
      steps += 1;
      if (steps > maxSteps) {
        executionFailed = true;
        lastError =
          "Execution stopped: possible loop detected (max step limit reached)";
        break;
      }

      const current = queue.shift()!;
      const node = nodeMap.get(current.nodeId);
      if (!node) {
        executionFailed = true;
        lastError = `Node not found in workflow graph: ${current.nodeId}`;
        break;
      }

      const runCtx: NodeRunContext = {
        executionId,
        attempt,
        node,
        inputData: current.inputData,
      };

      const logId = await insertRunningNodeLog(adminClient, runCtx);
      const started = Date.now();

      const result = await runSingleNode(
        executeNodeUrl,
        serviceRoleKey,
        workflow.id,
        executionId,
        node,
        current.inputData,
      );

      const durationMs = Date.now() - started;
      const nodeError = result.error;
      const nodeOutput = result.output;

      if (nodeError) {
        const outgoing = outgoingMap.get(node.id) ?? [];
        const errorEdges = selectNextConnections(outgoing, null, true);

        await finishNodeLog(adminClient, logId, {
          status: errorEdges.length > 0 ? "success" : "error",
          outputData: nodeOutput,
          error:
            errorEdges.length > 0
              ? `Recovered via error branch: ${nodeError}`
              : nodeError,
          durationMs,
        });

        if (errorEdges.length === 0) {
          executionFailed = true;
          lastError = `[Node: ${node.name}] ${nodeError}`;
          break;
        }

        for (const edge of errorEdges) {
          queue.push({
            nodeId: edge.target_node_id,
            inputData: nodeOutput,
            viaPort: edge.source_output,
          });
        }

        continue;
      }

      await finishNodeLog(adminClient, logId, {
        status: "success",
        outputData: nodeOutput,
        durationMs,
      });

      const outgoing = outgoingMap.get(node.id) ?? [];
      const nextEdges = selectNextConnections(outgoing, result.branch, false);

      for (const edge of nextEdges) {
        queue.push({
          nodeId: edge.target_node_id,
          inputData: nodeOutput,
          viaPort: edge.source_output,
        });
      }
    }

    if (!executionFailed) {
      break;
    }

    // retry if attempts remain
    const hasNextAttempt = attempt < maxRetries;
    if (!hasNextAttempt) break;
  }

  const finalStatus: ExecutionStatus = executionFailed ? "error" : "success";

  await adminClient
    .from("executions")
    .update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      error: executionFailed ? (lastError ?? "Execution failed") : null,
    })
    .eq("id", executionId);

  return jsonResponse({
    execution_id: executionId,
    status: finalStatus,
    ...(executionFailed ? { error: lastError ?? "Execution failed" } : {}),
  });
});
