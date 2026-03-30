-- 1) Recreate helper functions as SECURITY DEFINER so they bypass RLS recursion
--    and can safely read membership/share tables during policy checks.

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
      select 1 from membership m where m.role in ('owner', 'admin')
    )
    when 'owner'  then exists (
      select 1 from membership m where m.role = 'owner'
    )
  end
$$;

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
        c.user_id = p_user_id
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
              and (cs.shared_with is null or cs.shared_with = p_user_id)
          )
        )
      )
  )
$$;

-- 2) Keep function execute permissions explicit
grant execute on function public.is_workspace_member(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.has_workspace_role_at_least(uuid, uuid, public.workspace_role) to anon, authenticated, service_role;
grant execute on function public.can_use_credential(uuid, uuid) to anon, authenticated, service_role;

-- 3) (Optional but recommended) simplify workspace_members read policies to avoid broad self-recursive checks
drop policy if exists "Workspace members can view workspace memberships" on public.workspace_members;

create policy "Workspace admins can view workspace memberships"
  on public.workspace_members
  for select
  using (public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin'));

-- Keep existing "Users can view own workspace memberships" policy as-is.
