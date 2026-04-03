// supabase/functions/rerun-execution/index.ts
// Edge Function — re-runs a workflow from a previous execution record.
//
// Request body:
// {
//   execution_id: string
// }
//
// Behavior:
// 1) Validates caller JWT (must be authenticated)
// 2) Loads the execution row and verifies ownership via workflows.user_id
// 3) Finds earliest execution_logs entry for that execution and reuses its input_data as initial_data
// 4) Invokes execute-workflow with triggered_by: "manual"
// 5) Returns new execution id
//
// Response:
// {
//   previous_execution_id: string
//   execution_id: string
// }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

interface RerunExecutionRequest {
  execution_id?: string;
}

interface ExecutionRow {
  id: string;
  workflow_id: string;
  user_id: string;
}

interface WorkflowOwnerRow {
  id: string;
  user_id: string;
}

interface ExecutionLogRow {
  id: string;
  input_data: unknown;
  started_at: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function normalizeInitialData(value: unknown): unknown {
  // Keep original shape if present; fallback to empty object for compatibility.
  if (value === null || value === undefined) return {};
  return value;
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
  const executeWorkflowUrl = Deno.env.get("EXECUTE_WORKFLOW_URL");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !executeWorkflowUrl) {
    return jsonResponse({ error: "Missing required environment variables" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Authorization header required" }, 401);
  }

  // User-scoped client for JWT validation
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ error: "Invalid or expired token" }, 401);
  }

  const callerUserId = authData.user.id;

  let body: RerunExecutionRequest;
  try {
    body = (await req.json()) as RerunExecutionRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const executionId = (body.execution_id ?? "").trim();
  if (!executionId) {
    return jsonResponse({ error: "execution_id is required" }, 400);
  }

  // Admin client for cross-table checks + internal execution trigger
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Load original execution
  const { data: execution, error: executionError } = await adminClient
    .from("executions")
    .select("id, workflow_id, user_id")
    .eq("id", executionId)
    .single<ExecutionRow>();

  if (executionError || !execution) {
    return jsonResponse({ error: "Execution not found" }, 404);
  }

  // Verify ownership through workflow owner to avoid stale/mismatched execution user_id assumptions
  const { data: workflow, error: workflowError } = await adminClient
    .from("workflows")
    .select("id, user_id")
    .eq("id", execution.workflow_id)
    .single<WorkflowOwnerRow>();

  if (workflowError || !workflow) {
    return jsonResponse({ error: "Workflow not found for this execution" }, 404);
  }

  if (workflow.user_id !== callerUserId) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // Reuse initial input_data from earliest node log if available.
  const { data: firstLog, error: logError } = await adminClient
    .from("execution_logs")
    .select("id, input_data, started_at")
    .eq("execution_id", execution.id)
    .order("started_at", { ascending: true })
    .limit(1)
    .maybeSingle<ExecutionLogRow>();

  if (logError) {
    return jsonResponse(
      {
        error: "Failed to load execution logs for rerun",
        detail: logError.message,
      },
      500,
    );
  }

  const initialData = normalizeInitialData(firstLog?.input_data);

  // Trigger execute-workflow as internal service call.
  let newExecutionId = "";
  try {
    const triggerResponse = await fetch(executeWorkflowUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        workflow_id: execution.workflow_id,
        triggered_by: "manual",
        initial_data: initialData,
      }),
    });

    const triggerBodyText = await triggerResponse.text();

    if (!triggerResponse.ok) {
      return jsonResponse(
        {
          error: "Failed to trigger workflow rerun",
          detail: triggerBodyText,
        },
        502,
      );
    }

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(triggerBodyText) as Record<string, unknown>;
    } catch {
      return jsonResponse(
        {
          error: "Invalid response from execute-workflow",
          detail: triggerBodyText,
        },
        502,
      );
    }

    const candidate = parsed["execution_id"];
    if (typeof candidate !== "string" || candidate.trim().length === 0) {
      return jsonResponse(
        {
          error: "execute-workflow did not return execution_id",
          detail: parsed,
        },
        502,
      );
    }

    newExecutionId = candidate;
  } catch (err: unknown) {
    return jsonResponse(
      {
        error: "Failed to call execute-workflow",
        detail: getErrorMessage(err),
      },
      502,
    );
  }

  return jsonResponse({
    previous_execution_id: execution.id,
    execution_id: newExecutionId,
  });
});
