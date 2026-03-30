-- ============================================================
-- AutoFlow — Workspace Membership + Credential Sharing
-- 0003_workspace_credential_sharing.sql
-- ============================================================
--
-- This migration adds:
-- 1) workspace_members table (owner/admin/member roles)
-- 2) credential_shares table for explicit credential sharing
-- 3) helper functions for role checks
-- 4) updated RLS policies for workspaces/workflows/credentials/scheduled_jobs
--
-- Goals:
-- - Enable workspace-level collaboration
-- - Keep least-privilege defaults
-- - Preserve owner authority while allowing admin/member collaboration
--
-- Role semantics:
-- - owner: full control (workspace owner_id)
-- - admin: can manage workspace resources and share credentials
-- - member: can read workspace resources and use shared credentials
--
-- Notes:
-- - Existing personal workspace behavior remains valid.
-- - Existing rows in workspaces/workflows/credentials are preserved.
-- - We bootstrap owner membership rows for all existing workspaces.

-- ============================================================
-- ENUM: workspace_role
-- ============================================================

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'workspace_role'
      and n.nspname = 'public'
  ) then
    create type public.workspace_role as enum ('owner', 'admin', 'member');
  end if;
end
$$;

comment on type public.workspace_role is
  'Role of a user inside a workspace.';


-- ============================================================
-- TABLE: workspace_members
-- ============================================================

create table if not exists public.workspace_members (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role          public.workspace_role not null default 'member',
  invited_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

comment on table public.workspace_members is
  'Membership records for users in workspaces.';
comment on column public.workspace_members.role is
  'owner | admin | member';

create index if not exists workspace_members_workspace_id_idx
  on public.workspace_members (workspace_id);

create index if not exists workspace_members_user_id_idx
  on public.workspace_members (user_id);

create index if not exists workspace_members_workspace_role_idx
  on public.workspace_members (workspace_id, role);

drop trigger if exists workspace_members_updated_at on public.workspace_members;
create trigger workspace_members_updated_at
  before update on public.workspace_members
  for each row execute procedure public.handle_updated_at();

alter table public.workspace_members enable row level security;


-- ============================================================
-- TABLE: credential_shares
-- ============================================================

create table if not exists public.credential_shares (
  id              uuid primary key default gen_random_uuid(),
  credential_id   uuid not null references public.credentials(id) on delete cascade,
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  shared_by       uuid not null references public.profiles(id) on delete cascade,
  shared_with     uuid references public.profiles(id) on delete cascade, -- null => workspace-wide share
  can_edit        boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Avoid duplicate explicit user share rows for same credential/workspace/user
  unique (credential_id, workspace_id, shared_with)
);

comment on table public.credential_shares is
  'Explicit credential sharing records. shared_with null means workspace-wide share.';
comment on column public.credential_shares.can_edit is
  'Whether recipient can update/delete credential metadata (not plaintext).';

create index if not exists credential_shares_credential_id_idx
  on public.credential_shares (credential_id);

create index if not exists credential_shares_workspace_id_idx
  on public.credential_shares (workspace_id);

create index if not exists credential_shares_shared_with_idx
  on public.credential_shares (shared_with);

drop trigger if exists credential_shares_updated_at on public.credential_shares;
create trigger credential_shares_updated_at
  before update on public.credential_shares
  for each row execute procedure public.handle_updated_at();

alter table public.credential_shares enable row level security;


-- ============================================================
-- HELPERS: workspace role checks
-- ============================================================

create or replace function public.is_workspace_member(
  p_workspace_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = p_user_id
  )
$$;

comment on function public.is_workspace_member(uuid, uuid) is
  'Returns true if given user has any membership in workspace.';

create or replace function public.has_workspace_role_at_least(
  p_workspace_id uuid,
  p_user_id uuid,
  p_min_role public.workspace_role
)
returns boolean
language sql
stable
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
  'Checks whether user has at least requested role in workspace.';

create or replace function public.can_use_credential(
  p_credential_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
as $$
  -- A user can use a credential if:
  -- 1) They are the owner (credentials.user_id), OR
  -- 2) They are a member of the credential workspace and the credential has
  --    a workspace-wide share, OR
  -- 3) They have an explicit user-level share.
  select exists (
    select 1
    from public.credentials c
    where c.id = p_credential_id
      and (
        c.user_id = p_user_id
        or exists (
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
$$;

comment on function public.can_use_credential(uuid, uuid) is
  'Checks whether user can read/use credential based on owner or share records.';


-- ============================================================
-- BOOTSTRAP: ensure owner is present in workspace_members
-- ============================================================

insert into public.workspace_members (workspace_id, user_id, role, invited_by)
select w.id, w.owner_id, 'owner'::public.workspace_role, w.owner_id
from public.workspaces w
on conflict (workspace_id, user_id) do update
  set role = 'owner',
      updated_at = now();


-- ============================================================
-- TRIGGER: maintain owner membership on workspace ownership changes/inserts
-- ============================================================

create or replace function public.ensure_workspace_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role, invited_by)
  values (new.id, new.owner_id, 'owner', new.owner_id)
  on conflict (workspace_id, user_id) do update
    set role = 'owner',
        updated_at = now();

  return new;
end;
$$;

comment on function public.ensure_workspace_owner_membership() is
  'Ensures workspace owner always has owner role in workspace_members.';

drop trigger if exists workspaces_ensure_owner_membership on public.workspaces;
create trigger workspaces_ensure_owner_membership
  after insert or update of owner_id
  on public.workspaces
  for each row
  execute procedure public.ensure_workspace_owner_membership();


-- ============================================================
-- RLS POLICIES: workspace_members
-- ============================================================

drop policy if exists "Users can view own workspace memberships" on public.workspace_members;
drop policy if exists "Workspace admins can view memberships" on public.workspace_members;
drop policy if exists "Workspace admins can manage memberships" on public.workspace_members;
drop policy if exists "Workspace owners can manage memberships" on public.workspace_members;

create policy "Users can view own workspace memberships"
  on public.workspace_members
  for select
  using (user_id = auth.uid());

create policy "Workspace members can view workspace memberships"
  on public.workspace_members
  for select
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Workspace admins can insert memberships"
  on public.workspace_members
  for insert
  with check (
    public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin')
    and role <> 'owner'
  );

create policy "Workspace admins can update memberships"
  on public.workspace_members
  for update
  using (public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin'))
  with check (
    public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin')
    and role <> 'owner'
  );

create policy "Workspace owners can update owner memberships"
  on public.workspace_members
  for update
  using (public.has_workspace_role_at_least(workspace_id, auth.uid(), 'owner'))
  with check (public.has_workspace_role_at_least(workspace_id, auth.uid(), 'owner'));

create policy "Workspace admins can delete memberships"
  on public.workspace_members
  for delete
  using (
    public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin')
    and role <> 'owner'
  );

create policy "Workspace owners can delete memberships"
  on public.workspace_members
  for delete
  using (public.has_workspace_role_at_least(workspace_id, auth.uid(), 'owner'));


-- ============================================================
-- RLS POLICIES: credential_shares
-- ============================================================

drop policy if exists "Users can view credential shares for accessible credentials" on public.credential_shares;
drop policy if exists "Users can manage credential shares with admin role" on public.credential_shares;

create policy "Users can view credential shares for accessible credentials"
  on public.credential_shares
  for select
  using (
    public.can_use_credential(credential_id, auth.uid())
    or public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin')
  );

create policy "Workspace admins can insert credential shares"
  on public.credential_shares
  for insert
  with check (
    public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin')
    and exists (
      select 1
      from public.credentials c
      where c.id = credential_id
        and c.workspace_id = workspace_id
    )
  );

create policy "Workspace admins can update credential shares"
  on public.credential_shares
  for update
  using (public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin'))
  with check (public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin'));

create policy "Workspace admins can delete credential shares"
  on public.credential_shares
  for delete
  using (public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin'));


-- ============================================================
-- UPDATED RLS: workspaces
-- ============================================================

alter table public.workspaces enable row level security;

drop policy if exists "Users can view their own workspaces" on public.workspaces;
drop policy if exists "Users can insert their own workspaces" on public.workspaces;
drop policy if exists "Users can update their own workspaces" on public.workspaces;
drop policy if exists "Users can delete their own workspaces" on public.workspaces;

create policy "Workspace members can view workspaces"
  on public.workspaces
  for select
  using (public.is_workspace_member(id, auth.uid()));

create policy "Users can insert workspaces they own"
  on public.workspaces
  for insert
  with check (owner_id = auth.uid());

create policy "Workspace admins can update workspace"
  on public.workspaces
  for update
  using (public.has_workspace_role_at_least(id, auth.uid(), 'admin'))
  with check (public.has_workspace_role_at_least(id, auth.uid(), 'admin'));

create policy "Workspace owners can delete workspace"
  on public.workspaces
  for delete
  using (public.has_workspace_role_at_least(id, auth.uid(), 'owner'));


-- ============================================================
-- UPDATED RLS: workflows
-- ============================================================

alter table public.workflows enable row level security;

drop policy if exists "Users can view their own workflows" on public.workflows;
drop policy if exists "Users can insert their own workflows" on public.workflows;
drop policy if exists "Users can update their own workflows" on public.workflows;
drop policy if exists "Users can delete their own workflows" on public.workflows;

create policy "Workspace members can view workflows"
  on public.workflows
  for select
  using (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Workspace members can insert workflows"
  on public.workflows
  for insert
  with check (
    public.is_workspace_member(workspace_id, auth.uid())
    and user_id = auth.uid()
  );

create policy "Workspace members can update workflows"
  on public.workflows
  for update
  using (public.is_workspace_member(workspace_id, auth.uid()))
  with check (public.is_workspace_member(workspace_id, auth.uid()));

create policy "Workspace admins can delete workflows"
  on public.workflows
  for delete
  using (public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin'));


-- ============================================================
-- UPDATED RLS: credentials
-- ============================================================

alter table public.credentials enable row level security;

drop policy if exists "Users can view their own credentials" on public.credentials;
drop policy if exists "Users can insert their own credentials" on public.credentials;
drop policy if exists "Users can update their own credentials" on public.credentials;
drop policy if exists "Users can delete their own credentials" on public.credentials;

create policy "Users can view owned or shared credentials"
  on public.credentials
  for select
  using (
    user_id = auth.uid()
    or public.can_use_credential(id, auth.uid())
  );

create policy "Workspace members can insert credentials"
  on public.credentials
  for insert
  with check (
    public.is_workspace_member(workspace_id, auth.uid())
    and user_id = auth.uid()
  );

create policy "Owners or shared editors can update credentials"
  on public.credentials
  for update
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.credential_shares cs
      where cs.credential_id = credentials.id
        and cs.workspace_id = credentials.workspace_id
        and cs.shared_with = auth.uid()
        and cs.can_edit = true
    )
    or (
      public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin')
      and public.is_workspace_member(workspace_id, auth.uid())
    )
  )
  with check (
    user_id = auth.uid()
    or exists (
      select 1
      from public.credential_shares cs
      where cs.credential_id = credentials.id
        and cs.workspace_id = credentials.workspace_id
        and cs.shared_with = auth.uid()
        and cs.can_edit = true
    )
    or (
      public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin')
      and public.is_workspace_member(workspace_id, auth.uid())
    )
  );

create policy "Owners or workspace admins can delete credentials"
  on public.credentials
  for delete
  using (
    user_id = auth.uid()
    or public.has_workspace_role_at_least(workspace_id, auth.uid(), 'admin')
  );


-- ============================================================
-- UPDATED RLS: scheduled_jobs
-- (if table exists from 0002)
-- ============================================================

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'scheduled_jobs'
  ) then
    execute 'alter table public.scheduled_jobs enable row level security';

    execute 'drop policy if exists "Users can view own scheduled jobs" on public.scheduled_jobs';
    execute 'drop policy if exists "Users can insert own scheduled jobs" on public.scheduled_jobs';
    execute 'drop policy if exists "Users can update own scheduled jobs" on public.scheduled_jobs';
    execute 'drop policy if exists "Users can delete own scheduled jobs" on public.scheduled_jobs';

    execute $sql$
      create policy "Workspace members can view scheduled jobs"
        on public.scheduled_jobs
        for select
        using (
          exists (
            select 1
            from public.workflows wf
            where wf.id = scheduled_jobs.workflow_id
              and public.is_workspace_member(wf.workspace_id, auth.uid())
          )
        )
    $sql$;

    execute $sql$
      create policy "Workspace admins can insert scheduled jobs"
        on public.scheduled_jobs
        for insert
        with check (
          exists (
            select 1
            from public.workflows wf
            where wf.id = scheduled_jobs.workflow_id
              and public.has_workspace_role_at_least(wf.workspace_id, auth.uid(), 'admin')
          )
        )
    $sql$;

    execute $sql$
      create policy "Workspace admins can update scheduled jobs"
        on public.scheduled_jobs
        for update
        using (
          exists (
            select 1
            from public.workflows wf
            where wf.id = scheduled_jobs.workflow_id
              and public.has_workspace_role_at_least(wf.workspace_id, auth.uid(), 'admin')
          )
        )
        with check (
          exists (
            select 1
            from public.workflows wf
            where wf.id = scheduled_jobs.workflow_id
              and public.has_workspace_role_at_least(wf.workspace_id, auth.uid(), 'admin')
          )
        )
    $sql$;

    execute $sql$
      create policy "Workspace admins can delete scheduled jobs"
        on public.scheduled_jobs
        for delete
        using (
          exists (
            select 1
            from public.workflows wf
            where wf.id = scheduled_jobs.workflow_id
              and public.has_workspace_role_at_least(wf.workspace_id, auth.uid(), 'admin')
          )
        )
    $sql$;
  end if;
end
$$;


-- ============================================================
-- EXECUTIONS / EXECUTION_LOGS NOTE
-- ============================================================
-- Existing execution policies in 0001 are user-based:
-- executions.user_id = auth.uid()
-- execution_logs readable via executions.user_id
--
-- This migration intentionally does NOT broaden those policies yet.
-- If you want workspace-shared execution visibility, add a dedicated migration
-- with explicit collaboration visibility rules.


-- ============================================================
-- END
-- ============================================================
