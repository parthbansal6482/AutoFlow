// supabase/functions/delete-execution/index.ts
// Authenticated Edge Function — deletes an execution (and its logs via FK cascade)
// with ownership checks.
//
// Request body:
//   {
//     execution_id: string
//   }
//
// Response:
//   {
//     success: true,
//     execution_id: string
//   }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface DeleteExecutionRequest {
  execution_id?: string;
}

interface ExecutionOwnershipRow {
  id: string;
  user_id: string;
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

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Missing required environment variables" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Authorization header required" }, 401);
  }

  // User-scoped client to validate JWT and identify caller
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

  // Admin client for ownership validation + deletion
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: DeleteExecutionRequest;
  try {
    body = (await req.json()) as DeleteExecutionRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const executionId = body.execution_id?.trim();
  if (!executionId) {
    return jsonResponse({ error: "execution_id is required" }, 400);
  }

  // Ownership check
  const { data: execution, error: fetchError } = await adminClient
    .from("executions")
    .select("id, user_id")
    .eq("id", executionId)
    .single<ExecutionOwnershipRow>();

  if (fetchError || !execution) {
    return jsonResponse({ error: "Execution not found" }, 404);
  }

  if (execution.user_id !== user.id) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  // Deleting execution will cascade to execution_logs via FK ON DELETE CASCADE.
  const { error: deleteError } = await adminClient
    .from("executions")
    .delete()
    .eq("id", executionId);

  if (deleteError) {
    return jsonResponse(
      {
        error: "Failed to delete execution",
        detail: deleteError.message,
      },
      500,
    );
  }

  return jsonResponse({
    success: true,
    execution_id: executionId,
  });
});
