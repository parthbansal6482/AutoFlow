// supabase/functions/manage-workspace-members/index.ts
// Edge Function — workspace membership management
//
// Operations:
// - list_members
// - add_member
// - update_member_role
// - remove_member
//
// Security model:
// - Requires authenticated user JWT
// - Uses helper DB functions/policies from migration 0003 for role checks
// - Admins can manage members (except owner role assignment)
// - Owners can remove/update members including admins
//
// Request body:
// {
//   action: "list_members" | "add_member" | "update_member_role" | "remove_member",
//   workspace_id: string,
//   user_id?: string,               // required for add/update/remove
//   role?: "admin" | "member"       // required for add/update
// }
//
// Response examples:
// { success: true, members: WorkspaceMember[] }
// { success: true, member: WorkspaceMember }
// { success: true, removed: true }

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";

type WorkspaceRole = "owner" | "admin" | "member";
type MembershipAction =
  | "list_members"
  | "add_member"
  | "update_member_role"
  | "remove_member";

interface ManageMembersRequest {
  action?: MembershipAction;
  workspace_id?: string;
  user_id?: string;
  role?: WorkspaceRole;
}

interface WorkspaceMemberRow {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isValidRole(role: unknown): role is WorkspaceRole {
  return role === "owner" || role === "admin" || role === "member";
}

function isManageableRole(role: unknown): role is "admin" | "member" {
  return role === "admin" || role === "member";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseBody(raw: unknown): ManageMembersRequest {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  return raw as ManageMembersRequest;
}

async function hasRoleAtLeast(
  adminClient: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string,
  minRole: WorkspaceRole,
): Promise<boolean> {
  const { data, error } = await adminClient.rpc("has_workspace_role_at_least", {
    p_workspace_id: workspaceId,
    p_user_id: userId,
    p_min_role: minRole,
  });

  if (error) return false;
  return data === true;
}

async function listMembers(
  adminClient: ReturnType<typeof createClient>,
  workspaceId: string,
): Promise<WorkspaceMemberRow[]> {
  const { data, error } = await adminClient
    .from("workspace_members")
    .select("id, workspace_id, user_id, role, invited_by, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as WorkspaceMemberRow[];
}

async function addMember(
  adminClient: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string,
  role: "admin" | "member",
  invitedBy: string,
): Promise<WorkspaceMemberRow> {
  const { data, error } = await adminClient
    .from("workspace_members")
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: userId,
        role,
        invited_by: invitedBy,
      },
      { onConflict: "workspace_id,user_id" },
    )
    .select("id, workspace_id, user_id, role, invited_by, created_at, updated_at")
    .single<WorkspaceMemberRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to add member");
  }

  return data;
}

async function updateMemberRole(
  adminClient: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string,
  role: "admin" | "member",
): Promise<WorkspaceMemberRow> {
  // Prevent overriding owner role through this endpoint
  const { data: existing, error: fetchError } = await adminClient
    .from("workspace_members")
    .select("id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single<{ id: string; role: WorkspaceRole }>();

  if (fetchError || !existing) {
    throw new Error("Member not found");
  }

  if (existing.role === "owner") {
    throw new Error("Cannot modify owner role through this operation");
  }

  const { data, error } = await adminClient
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .select("id, workspace_id, user_id, role, invited_by, created_at, updated_at")
    .single<WorkspaceMemberRow>();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update member role");
  }

  return data;
}

async function removeMember(
  adminClient: ReturnType<typeof createClient>,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data: existing, error: fetchError } = await adminClient
    .from("workspace_members")
    .select("id, role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .single<{ id: string; role: WorkspaceRole }>();

  if (fetchError || !existing) {
    throw new Error("Member not found");
  }

  if (existing.role === "owner") {
    throw new Error("Cannot remove workspace owner membership");
  }

  const { error } = await adminClient
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }

  return true;
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
    return jsonResponse(
      { error: "Missing required environment variables" },
      500,
    );
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

  let body: ManageMembersRequest;
  try {
    body = parseBody(await req.json());
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const action = body.action;
  const workspaceId = body.workspace_id?.trim();

  if (!action) {
    return jsonResponse({ error: "action is required" }, 400);
  }

  if (!isNonEmptyString(workspaceId)) {
    return jsonResponse({ error: "workspace_id is required" }, 400);
  }

  // Access gate:
  // - list_members: member+
  // - add/update/remove: admin+
  const minRole: WorkspaceRole =
    action === "list_members" ? "member" : "admin";

  const allowed = await hasRoleAtLeast(
    adminClient,
    workspaceId,
    user.id,
    minRole,
  );

  if (!allowed) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  try {
    if (action === "list_members") {
      const members = await listMembers(adminClient, workspaceId);
      return jsonResponse({ success: true, members });
    }

    if (action === "add_member") {
      const targetUserId = body.user_id?.trim();
      const role = body.role;

      if (!isNonEmptyString(targetUserId)) {
        return jsonResponse({ error: "user_id is required for add_member" }, 400);
      }

      if (!isManageableRole(role)) {
        return jsonResponse(
          { error: "role must be 'admin' or 'member' for add_member" },
          400,
        );
      }

      const member = await addMember(
        adminClient,
        workspaceId,
        targetUserId,
        role,
        user.id,
      );

      return jsonResponse({ success: true, member });
    }

    if (action === "update_member_role") {
      const targetUserId = body.user_id?.trim();
      const role = body.role;

      if (!isNonEmptyString(targetUserId)) {
        return jsonResponse(
          { error: "user_id is required for update_member_role" },
          400,
        );
      }

      if (!isManageableRole(role)) {
        return jsonResponse(
          { error: "role must be 'admin' or 'member' for update_member_role" },
          400,
        );
      }

      const member = await updateMemberRole(
        adminClient,
        workspaceId,
        targetUserId,
        role,
      );

      return jsonResponse({ success: true, member });
    }

    if (action === "remove_member") {
      const targetUserId = body.user_id?.trim();

      if (!isNonEmptyString(targetUserId)) {
        return jsonResponse(
          { error: "user_id is required for remove_member" },
          400,
        );
      }

      await removeMember(adminClient, workspaceId, targetUserId);
      return jsonResponse({ success: true, removed: true });
    }

    return jsonResponse(
      {
        error:
          "Unsupported action. Allowed: list_members, add_member, update_member_role, remove_member",
      },
      400,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});
