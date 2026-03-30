-- ============================================================
-- AutoFlow — Fix Workspace Sharing RLS Recursion
-- 0004_fix_workspace_rls_recursion.sql
-- ============================================================
--
-- Problem:
-- RLS policies introduced for workspace sharing can recurse when policy checks
-- query tables that are themselves protected by policies that call the same
-- helper functions.
--
-- Fix:
-- Recreate helper authorization functions as SECURITY DEFINER with explicit
-- search_path. This allows policies to evaluate membership/share checks without
-- recursive RLS evaluation loops.
--
-- Functions updated:
-- - public.is_workspace_member(uuid, uuid)
-- - public.has_workspace_role_at_least(uuid, uuid, public.workspace_role)
-- - public.can_use_credential(uuid, uuid)
--
-- Also:
-- - Explicit GRANT EXECUTE for anon/authenticated/service_role
-- - Replace broad workspace_members SELECT policy with admin-only workspace list
--   + self-membership read policy to reduce recursive policy pressure.
-- ============================================================

-- 1) Helper: is_workspace_member
create or replace function public.is_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_user_id
  )
$$;

comment on function public.is_workspace_member(uuid, uuid) is
  'Returns true if the user is a member of the workspace. SECURITY DEFINER to avoid RLS recursion.';


-- 2) Helper: has_workspace_role_at_least
create or replace function public.has_workspace_role_at_least(
  p_workspace_id uuid,
  p_user_id uuid,
  p_min_role public.workspace_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with membership as (
    select wm.role
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_user_id
    limit 1
  )
  select case p_min_role
    when 'member' then exists (select 1 from membership)
    when 'admin'  then exists (
      select 1
      from membership m
      where m.role in ('owner', 'admin')
    )
    when 'owner'  then exists (
      select 1
      from membership m
      where m.role = 'owner'
    )
  end
$$;

comment on function public.has_workspace_role_at_least(uuid, uuid, public.workspace_role) is
  'Checks minimum workspace role. SECURITY DEFINER to avoid RLS recursion.';


-- 3) Helper: can_use_credential
create or replace function public.can_use_credential(
  p_credential_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.credentials c
    where c.id = p_credential_id
      and (
        -- owner can always use
        c.user_id = p_user_id

        -- shared credential access for workspace members
        or (
          exists (
            select 1
            from public.workspace_members wm
            where wm.workspace_id = c.workspace_id
              and wm.user_id = p_user_id
          )
          and exists (
            select 1
            from public.credential_shares cs
            where cs.credential_id = c.id
              and cs.workspace_id = c.workspace_id
              and (
                cs.shared_with is null
                or cs.shared_with = p_user_id
              )
          )
        )
      )
  )
$$;

comment on function public.can_use_credential(uuid, uuid) is
  'Checks whether a user can use a credential by owner/share rules. SECURITY DEFINER to avoid RLS recursion.';


-- 4) Ensure callable by API roles
grant execute on function public.is_workspace_member(uuid, uuid)
  to anon, authenticated, service_role;

grant execute on function public.has_workspace_role_at_least(uuid, uuid, public.workspace_role)
  to anon, authenticated, service_role;

grant execute on function public.can_use_credential(uuid, uuid)
  to anon, authenticated, service_role;


-- 5) Tighten workspace_members read policies to reduce recursion pressure
-- Keep self-view + admin-view; drop broad "member can view all memberships" policy.
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'workspace_members'
  ) then
    execute 'alter table public.workspace_members enable row level security';

    execute 'drop policy if exists "Workspace members can view workspace memberships" on public.workspace_members';
    execute 'drop policy if exists "Workspace admins can view workspace memberships" on public.workspace_members';
    execute 'drop policy if exists "Users can view own workspace memberships" on public.workspace_members';

    execute $sql$
      create policy "Users can view own workspace memberships"
        on public.workspace_members
        for select
        using (user_id = auth.uid())
    $sql$;

    execute $sql$
      create policy "Workspace admins can view workspace memberships"
        on public.workspace_members
        for select
        using (public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin'))
    $sql$;
  end if;
end
$$;

-- ============================================================
-- END
-- ============================================================
