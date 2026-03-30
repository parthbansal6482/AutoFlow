// supabase/functions/manage-credential-shares/index.ts
// Edge Function — manage credential sharing operations.
//
// Supported operations (POST body):
// {
//   action: "list" | "share" | "update" | "unshare",
//   ...
// }
//
// list:
// {
//   action: "list",
//   credential_id: string
// }
//
// share:
// {
//   action: "share",
//   credential_id: string,
//   workspace_id: string,
//   shared_with?: string | null, // null => workspace-wide share
//   can_edit?: boolean
// }
//
// update:
// {
//   action: "update",
//   share_id: string,
//   can_edit: boolean
// }
//
// unshare:
// {
//   action: "unshare",
//   share_id: string
// }
//
// Security model:
// - Caller must be authenticated.
// - Uses helper DB function has_workspace_role_at_least(workspace_id, user_id, 'admin')
//   to enforce admin-level sharing operations.
// - Listing is allowed for users who can use the credential (owner/share) OR workspace admin.

import { createClient } from "npm:@supabase/supabase-js@2";

type Action = "list" | "share" | "update" | "unshare";

interface BaseRequest {
  action?: Action;
}

interface ListSharesRequest extends BaseRequest {
  action: "list";
  credential_id?: string;
}

interface ShareCredentialRequest extends BaseRequest {
  action: "share";
  credential_id?: string;
  workspace_id?: string;
  shared_with?: string | null;
  can_edit?: boolean;
}

interface UpdateShareRequest extends BaseRequest {
  action: "update";
  share_id?: string;
  can_edit?: boolean;
}

interface UnshareRequest extends BaseRequest {
  action: "unshare";
  share_id?: string;
}

interface CredentialRow {
  id: string;
  workspace_id: string;
  user_id: string;
}

interface CredentialShareRow {
  id: string;
  credential_id: string;
  workspace_id: string;
  shared_by: string;
  shared_with: string | null;
  can_edit: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkspaceRoleCheckRow {
  ok: boolean;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length > 0 ? v : null;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return asNonEmptyString(value);
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

async function isWorkspaceAdmin(
  adminClient: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await adminClient.rpc("has_workspace_role_at_least", {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_min_role: "admin",
  });

  if (error) return false;
  return data === true;
}

async function canUseCredential(
  adminClient: ReturnType<typeof createClient>,
  credentialId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await adminClient.rpc("can_use_credential", {
    p_credential_id: credentialId,
    p_user_id: userId,
  });

  if (error) return false;
  return data === true;
}

async function getCredentialById(
  adminClient: ReturnType<typeof createClient>,
  credentialId: string,
): Promise<CredentialRow | null> {
  const { data, error } = await adminClient
    .from("credentials")
    .select("id, workspace_id, user_id")
    .eq("id", credentialId)
    .single<CredentialRow>();

  if (error || !data) return null;
  return data;
}

async function handleList(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  body: ListSharesRequest,
): Promise<Response> {
  const credentialId = asNonEmptyString(body.credential_id);
  if (!credentialId) {
    return jsonResponse({ error: "credential_id is required" }, 400);
  }

  const credential = await getCredentialById(adminClient, credentialId);
  if (!credential) {
    return jsonResponse({ error: "Credential not found" }, 404);
  }

  const [workspaceAdmin, userCanUse] = await Promise.all([
    isWorkspaceAdmin(adminClient, credential.workspace_id, userId),
    canUseCredential(adminClient, credential.id, userId),
  ]);

  if (!workspaceAdmin && !userCanUse) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const { data, error } = await adminClient
    .from("credential_shares")
    .select(
      "id, credential_id, workspace_id, shared_by, shared_with, can_edit, created_at, updated_at",
    )
    .eq("credential_id", credential.id)
    .order("created_at", { ascending: true });

  if (error) {
    return jsonResponse(
      { error: "Failed to list credential shares", detail: error.message },
      500,
    );
  }

  return jsonResponse({
    credential_id: credential.id,
    workspace_id: credential.workspace_id,
    shares: (data ?? []) as CredentialShareRow[],
  });
}

async function handleShare(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  body: ShareCredentialRequest,
): Promise<Response> {
  const credentialId = asNonEmptyString(body.credential_id);
  const workspaceId = asNonEmptyString(body.workspace_id);
  const sharedWith = asNullableString(body.shared_with);
  const canEdit = asBoolean(body.can_edit, false);

  if (!credentialId || !workspaceId) {
    return jsonResponse(
      { error: "credential_id and workspace_id are required" },
      400,
    );
  }

  // Workspace-wide shares cannot grant edit rights
  if (sharedWith === null && canEdit) {
    return jsonResponse(
      { error: "Workspace-wide share cannot set can_edit=true" },
      400,
    );
  }

  const credential = await getCredentialById(adminClient, credentialId);
  if (!credential) {
    return jsonResponse({ error: "Credential not found" }, 404);
  }

  if (credential.workspace_id !== workspaceId) {
    return jsonResponse(
      { error: "Credential does not belong to provided workspace_id" },
      400,
    );
  }

  const workspaceAdmin = await isWorkspaceAdmin(
    adminClient,
    workspaceId,
    userId,
  );
  if (!workspaceAdmin) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const insertPayload = {
    credential_id: credential.id,
    workspace_id: workspaceId,
    shared_by: userId,
    shared_with: sharedWith ?? null,
    can_edit: canEdit,
  };

  // onConflict handles idempotency for unique (credential_id, workspace_id, shared_with)
  const { data, error } = await adminClient
    .from("credential_shares")
    .upsert(insertPayload, {
      onConflict: "credential_id,workspace_id,shared_with",
      ignoreDuplicates: false,
    })
    .select(
      "id, credential_id, workspace_id, shared_by, shared_with, can_edit, created_at, updated_at",
    )
    .single<CredentialShareRow>();

  if (error || !data) {
    return jsonResponse(
      { error: "Failed to share credential", detail: error?.message },
      500,
    );
  }

  return jsonResponse({
    success: true,
    share: data,
  });
}

async function handleUpdate(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  body: UpdateShareRequest,
): Promise<Response> {
  const shareId = asNonEmptyString(body.share_id);
  if (!shareId) {
    return jsonResponse({ error: "share_id is required" }, 400);
  }

  if (typeof body.can_edit !== "boolean") {
    return jsonResponse({ error: "can_edit must be a boolean" }, 400);
  }

  const { data: existing, error: existingError } = await adminClient
    .from("credential_shares")
    .select(
      "id, credential_id, workspace_id, shared_by, shared_with, can_edit, created_at, updated_at",
    )
    .eq("id", shareId)
    .single<CredentialShareRow>();

  if (existingError || !existing) {
    return jsonResponse({ error: "Share not found" }, 404);
  }

  const workspaceAdmin = await isWorkspaceAdmin(
    adminClient,
    existing.workspace_id,
    userId,
  );
  if (!workspaceAdmin) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (existing.shared_with === null && body.can_edit === true) {
    return jsonResponse(
      { error: "Workspace-wide share cannot set can_edit=true" },
      400,
    );
  }

  const { data: updated, error: updateError } = await adminClient
    .from("credential_shares")
    .update({ can_edit: body.can_edit })
    .eq("id", existing.id)
    .select(
      "id, credential_id, workspace_id, shared_by, shared_with, can_edit, created_at, updated_at",
    )
    .single<CredentialShareRow>();

  if (updateError || !updated) {
    return jsonResponse(
      { error: "Failed to update share", detail: updateError?.message },
      500,
    );
  }

  return jsonResponse({
    success: true,
    share: updated,
  });
}

async function handleUnshare(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  body: UnshareRequest,
): Promise<Response> {
  const shareId = asNonEmptyString(body.share_id);
  if (!shareId) {
    return jsonResponse({ error: "share_id is required" }, 400);
  }

  const { data: existing, error: existingError } = await adminClient
    .from("credential_shares")
    .select("id, workspace_id")
    .eq("id", shareId)
    .single<{ id: string; workspace_id: string }>();

  if (existingError || !existing) {
    return jsonResponse({ error: "Share not found" }, 404);
  }

  const workspaceAdmin = await isWorkspaceAdmin(
    adminClient,
    existing.workspace_id,
    userId,
  );
  if (!workspaceAdmin) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  const { error: deleteError } = await adminClient
    .from("credential_shares")
    .delete()
    .eq("id", existing.id);

  if (deleteError) {
    return jsonResponse(
      { error: "Failed to remove share", detail: deleteError.message },
      500,
    );
  }

  return jsonResponse({
    success: true,
    share_id: existing.id,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: BaseRequest;
  try {
    body = (await req.json()) as BaseRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!isRecord(body)) {
    return jsonResponse({ error: "Invalid request payload" }, 400);
  }

  const action = body.action;
  if (!action) {
    return jsonResponse(
      { error: "action is required (list | share | update | unshare)" },
      400,
    );
  }

  switch (action) {
    case "list":
      return await handleList(
        adminClient,
        user.id,
        body as unknown as ListSharesRequest,
      );
    case "share":
      return await handleShare(
        adminClient,
        user.id,
        body as unknown as ShareCredentialRequest,
      );
    case "update":
      return await handleUpdate(
        adminClient,
        user.id,
        body as unknown as UpdateShareRequest,
      );
    case "unshare":
      return await handleUnshare(
        adminClient,
        user.id,
        body as unknown as UnshareRequest,
      );
    default:
      return jsonResponse(
        { error: "Unsupported action. Use list | share | update | unshare" },
        400,
      );
  }
});
