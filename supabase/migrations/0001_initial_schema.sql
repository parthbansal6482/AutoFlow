-- ============================================================
-- AutoFlow — Initial Schema Migration
-- 0001_initial_schema.sql
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_net" schema extensions;
create extension if not exists "pg_cron" schema extensions;

-- ============================================================
-- PROFILES
-- Extends auth.users with display info per user.
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Public user profile data. One row per auth.users entry.';

-- ============================================================
-- WORKSPACES
-- Groups of workflows/credentials belonging to a user.
-- In v1, each user has exactly one personal workspace.
-- ============================================================
create table if not exists public.workspaces (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.workspaces is 'Workspace container for workflows and credentials.';

-- ============================================================
-- WORKFLOWS
-- Nodes and connections are serialised as JSONB.
-- ============================================================
create table if not exists public.workflows (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name         text not null,
  description  text,
  active       boolean not null default false,
  nodes        jsonb not null default '[]'::jsonb,
  connections  jsonb not null default '[]'::jsonb,
  settings     jsonb not null default '{
    "timezone": "UTC",
    "save_execution_progress": true,
    "max_retries": 0
  }'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.workflows is 'Workflow definitions. Nodes and connections stored as JSONB arrays.';
comment on column public.workflows.nodes is 'Array of WorkflowNode objects (id, type, name, position, parameters, credential_id).';
comment on column public.workflows.connections is 'Array of WorkflowConnection objects (source_node_id, source_output, target_node_id, target_input).';

-- Performance index for listing workflows by workspace
create index if not exists workflows_workspace_id_idx on public.workflows(workspace_id);
create index if not exists workflows_user_id_idx on public.workflows(user_id);
create index if not exists workflows_active_idx on public.workflows(active) where active = true;

-- ============================================================
-- CREDENTIALS
-- Sensitive data is AES-256 encrypted via pgcrypto.
-- The raw secret NEVER enters this table — only ciphertext.
-- The encryption key lives solely in Edge Function env vars.
-- ============================================================
create table if not exists public.credentials (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  workspace_id   uuid not null references public.workspaces(id) on delete cascade,
  name           text not null,
  type           text not null, -- 'http' | 'oauth2' | 'apiKey' | 'basic' | 'postgres' | 'smtp'
  encrypted_data text not null, -- pgcrypto AES-256 ciphertext (base64)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.credentials is 'Stores encrypted credentials. encrypted_data is AES-256 ciphertext produced by the encrypt-credential Edge Function.';
comment on column public.credentials.encrypted_data is 'pgp_sym_encrypt output, base64 encoded. Decrypted only inside Edge Functions.';

create index if not exists credentials_workspace_id_idx on public.credentials(workspace_id);
create index if not exists credentials_user_id_idx on public.credentials(user_id);

-- ============================================================
-- EXECUTIONS
-- One record per workflow run.
-- ============================================================
create type public.execution_status as enum (
  'pending',
  'running',
  'success',
  'error',
  'cancelled'
);

create type public.execution_trigger as enum (
  'manual',
  'webhook',
  'cron'
);

create table if not exists public.executions (
  id            uuid primary key default uuid_generate_v4(),
  workflow_id   uuid not null references public.workflows(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        public.execution_status not null default 'pending',
  triggered_by  public.execution_trigger not null default 'manual',
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  error         text
);

comment on table public.executions is 'One row per workflow execution run.';

create index if not exists executions_workflow_id_idx on public.executions(workflow_id);
create index if not exists executions_user_id_idx on public.executions(user_id);
create index if not exists executions_status_idx on public.executions(status);
create index if not exists executions_started_at_idx on public.executions(started_at desc);

-- ============================================================
-- EXECUTION_LOGS
-- One record per node execution within a run.
-- Supabase Realtime publishes inserts/updates to the frontend.
-- ============================================================
create table if not exists public.execution_logs (
  id            uuid primary key default uuid_generate_v4(),
  execution_id  uuid not null references public.executions(id) on delete cascade,
  node_id       text not null,
  node_name     text not null,
  status        public.execution_status not null default 'pending',
  input_data    jsonb,
  output_data   jsonb,
  error         text,
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  duration_ms   integer
);

comment on table public.execution_logs is 'Per-node execution log. Realtime enabled — frontend subscribes for live updates.';

create index if not exists execution_logs_execution_id_idx on public.execution_logs(execution_id);
create index if not exists execution_logs_node_id_idx on public.execution_logs(execution_id, node_id);

-- ============================================================
-- REALTIME — enable publications for live log streaming
-- ============================================================
-- execution_logs: frontend subscribes to filter by execution_id
alter publication supabase_realtime add table public.execution_logs;
-- executions: frontend subscribes to track overall run status
alter publication supabase_realtime add table public.executions;

-- ============================================================
-- FUNCTIONS — updated_at auto-maintenance
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security definer
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Attach trigger to every table that has updated_at
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger workspaces_updated_at
  before update on public.workspaces
  for each row execute procedure public.handle_updated_at();

create trigger workflows_updated_at
  before update on public.workflows
  for each row execute procedure public.handle_updated_at();

create trigger credentials_updated_at
  before update on public.credentials
  for each row execute procedure public.handle_updated_at();

-- ============================================================
-- FUNCTION + TRIGGER — auto-create profile + workspace on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_id uuid;
begin
  -- 1. Insert profile
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  -- 2. Create personal workspace
  insert into public.workspaces (name, owner_id)
  values ('Personal', new.id)
  returning id into workspace_id;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

-- profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- workspaces
alter table public.workspaces enable row level security;

create policy "Users can view their own workspaces"
  on public.workspaces for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own workspaces"
  on public.workspaces for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own workspaces"
  on public.workspaces for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "Users can delete their own workspaces"
  on public.workspaces for delete
  using (auth.uid() = owner_id);

-- workflows
alter table public.workflows enable row level security;

create policy "Users can view their own workflows"
  on public.workflows for select
  using (auth.uid() = user_id);

create policy "Users can insert their own workflows"
  on public.workflows for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own workflows"
  on public.workflows for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own workflows"
  on public.workflows for delete
  using (auth.uid() = user_id);

-- credentials
alter table public.credentials enable row level security;

create policy "Users can view their own credentials"
  on public.credentials for select
  using (auth.uid() = user_id);

create policy "Users can insert their own credentials"
  on public.credentials for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own credentials"
  on public.credentials for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own credentials"
  on public.credentials for delete
  using (auth.uid() = user_id);

-- executions
alter table public.executions enable row level security;

create policy "Users can view their own executions"
  on public.executions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own executions"
  on public.executions for insert
  with check (auth.uid() = user_id);

-- execution_logs — access through execution ownership
alter table public.execution_logs enable row level security;

create policy "Users can view logs for their own executions"
  on public.execution_logs for select
  using (
    exists (
      select 1 from public.executions e
      where e.id = execution_logs.execution_id
        and e.user_id = auth.uid()
    )
  );

create policy "Service role can insert execution logs"
  on public.execution_logs for insert
  with check (
    exists (
      select 1 from public.executions e
      where e.id = execution_logs.execution_id
        and e.user_id = auth.uid()
    )
  );

-- ============================================================
-- GRANT service_role bypass (Edge Functions run as service_role)
-- No explicit grants needed — service_role bypasses RLS by default.
-- The Edge Functions must use the service_role key from env vars.
-- ============================================================
