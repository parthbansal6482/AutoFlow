-- ============================================================
-- AutoFlow — Cron Scheduling Support
-- 0002_cron_scheduling.sql
-- ============================================================

-- This migration adds:
-- 1) public.scheduled_jobs table to track cron schedules per workflow
-- 2) helper SQL functions to schedule/unschedule/sync cron jobs
-- 3) trigger to keep pg_cron in sync when workflows are changed
--
-- Notes:
-- - pg_cron + pg_net were enabled in 0001.
-- - Job execution calls execute-workflow Edge Function with:
--   { workflow_id, triggered_by: 'cron', initial_data: {} }
-- - Service role key is read from app settings table if present.
--   If no key exists, scheduling will raise a clear exception.

-- ============================================================
-- TABLE: app_settings (optional key/value storage)
-- ============================================================
create table if not exists public.app_settings (
  key         text primary key,
  value       text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.app_settings is
  'Global application settings used by DB-side helpers.';

comment on column public.app_settings.key is
  'Setting key. Example: SUPABASE_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY';

comment on column public.app_settings.value is
  'Setting value stored as text.';

-- updated_at trigger
drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute procedure public.handle_updated_at();

-- RLS for app_settings (owner-only read/write in v1)
alter table public.app_settings enable row level security;

drop policy if exists "Users can view app settings in own workspace" on public.app_settings;
drop policy if exists "Owners can manage app settings" on public.app_settings;

create policy "Owners can read app settings"
  on public.app_settings
  for select
  using (exists (
    select 1
    from public.workspaces w
    where w.owner_id = auth.uid()
  ));

create policy "Owners can write app settings"
  on public.app_settings
  for all
  using (exists (
    select 1
    from public.workspaces w
    where w.owner_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.workspaces w
    where w.owner_id = auth.uid()
  ));

-- ============================================================
-- TABLE: scheduled_jobs
-- ============================================================
create table if not exists public.scheduled_jobs (
  workflow_id   uuid primary key references public.workflows(id) on delete cascade,
  cron_expr     text not null,
  timezone      text not null default 'UTC',
  cron_job_id   bigint,
  cron_job_name text not null unique,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.scheduled_jobs is
  'Tracks pg_cron jobs linked to active workflows with cron-trigger nodes.';

comment on column public.scheduled_jobs.cron_job_id is
  'Job id returned by cron.schedule (nullable if not yet scheduled).';

comment on column public.scheduled_jobs.cron_job_name is
  'Deterministic cron job name: workflow-<workflow_id>.';

create index if not exists scheduled_jobs_cron_job_id_idx
  on public.scheduled_jobs (cron_job_id);

-- updated_at trigger
drop trigger if exists scheduled_jobs_updated_at on public.scheduled_jobs;
create trigger scheduled_jobs_updated_at
  before update on public.scheduled_jobs
  for each row execute procedure public.handle_updated_at();

-- RLS
alter table public.scheduled_jobs enable row level security;

drop policy if exists "Users can view own scheduled jobs" on public.scheduled_jobs;
drop policy if exists "Users can insert own scheduled jobs" on public.scheduled_jobs;
drop policy if exists "Users can update own scheduled jobs" on public.scheduled_jobs;
drop policy if exists "Users can delete own scheduled jobs" on public.scheduled_jobs;

create policy "Users can view own scheduled jobs"
  on public.scheduled_jobs
  for select
  using (
    exists (
      select 1
      from public.workflows wf
      where wf.id = scheduled_jobs.workflow_id
        and wf.user_id = auth.uid()
    )
  );

create policy "Users can insert own scheduled jobs"
  on public.scheduled_jobs
  for insert
  with check (
    exists (
      select 1
      from public.workflows wf
      where wf.id = scheduled_jobs.workflow_id
        and wf.user_id = auth.uid()
    )
  );

create policy "Users can update own scheduled jobs"
  on public.scheduled_jobs
  for update
  using (
    exists (
      select 1
      from public.workflows wf
      where wf.id = scheduled_jobs.workflow_id
        and wf.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.workflows wf
      where wf.id = scheduled_jobs.workflow_id
        and wf.user_id = auth.uid()
    )
  );

create policy "Users can delete own scheduled jobs"
  on public.scheduled_jobs
  for delete
  using (
    exists (
      select 1
      from public.workflows wf
      where wf.id = scheduled_jobs.workflow_id
        and wf.user_id = auth.uid()
    )
  );

-- ============================================================
-- HELPERS
-- ============================================================

-- Find first cron trigger config from workflow.nodes JSONB.
create or replace function public.get_workflow_cron_config(p_nodes jsonb)
returns table (cron_expr text, timezone text)
language sql
immutable
as $$
  with trigger_nodes as (
    select elem
    from jsonb_array_elements(coalesce(p_nodes, '[]'::jsonb)) as elem
    where elem->>'type' = 'cron-trigger'
    limit 1
  )
  select
    nullif((elem->'parameters'->>'cron')::text, '') as cron_expr,
    coalesce(nullif((elem->'parameters'->>'timezone')::text, ''), 'UTC') as timezone
  from trigger_nodes
$$;

comment on function public.get_workflow_cron_config(jsonb) is
  'Extracts cron expression and timezone from first cron-trigger node.';

-- Build deterministic cron job name.
create or replace function public.workflow_cron_job_name(p_workflow_id uuid)
returns text
language sql
immutable
as $$
  select 'workflow-' || p_workflow_id::text
$$;

comment on function public.workflow_cron_job_name(uuid) is
  'Returns deterministic pg_cron job name for a workflow.';

-- Unschedule helper by workflow id.
create or replace function public.unschedule_workflow_job(p_workflow_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_name text;
  v_existing_job_id bigint;
begin
  v_job_name := public.workflow_cron_job_name(p_workflow_id);

  -- Try direct unschedule by name if present in cron.job
  select j.jobid
    into v_existing_job_id
  from cron.job j
  where j.jobname = v_job_name
  limit 1;

  if v_existing_job_id is not null then
    perform cron.unschedule(v_existing_job_id);
  end if;

  delete from public.scheduled_jobs sj
  where sj.workflow_id = p_workflow_id;
end;
$$;

comment on function public.unschedule_workflow_job(uuid) is
  'Removes pg_cron job + scheduled_jobs row for workflow if present.';

-- Core sync function:
-- - If workflow inactive OR has no valid cron trigger => unschedule
-- - If active + valid cron trigger => upsert scheduled_jobs + (re)schedule pg_cron
create or replace function public.sync_workflow_cron_job(p_workflow_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workflow            public.workflows%rowtype;
  v_cron_expr           text;
  v_timezone            text;
  v_job_name            text;
  v_project_url         text;
  v_service_role_key    text;
  v_job_id              bigint;
  v_command             text;
  v_headers             text;
  v_body                text;
  v_old_job_id          bigint;
begin
  select *
    into v_workflow
  from public.workflows
  where id = p_workflow_id;

  if not found then
    -- nothing to sync
    return;
  end if;

  v_job_name := public.workflow_cron_job_name(v_workflow.id);

  -- Extract cron settings from node JSON
  select c.cron_expr, c.timezone
    into v_cron_expr, v_timezone
  from public.get_workflow_cron_config(v_workflow.nodes) c;

  -- If inactive or missing cron config, unschedule and exit.
  if v_workflow.active is false
     or v_cron_expr is null
     or length(trim(v_cron_expr)) = 0
  then
    perform public.unschedule_workflow_job(v_workflow.id);
    return;
  end if;

  -- Required settings for pg_net -> execute-workflow
  select value into v_project_url
  from public.app_settings
  where key = 'SUPABASE_PROJECT_URL';

  select value into v_service_role_key
  from public.app_settings
  where key = 'SUPABASE_SERVICE_ROLE_KEY';

  if v_project_url is null or v_service_role_key is null then
    raise exception
      'Missing app_settings keys SUPABASE_PROJECT_URL and/or SUPABASE_SERVICE_ROLE_KEY for cron scheduling';
  end if;

  -- Unschedule old job if exists
  select sj.cron_job_id into v_old_job_id
  from public.scheduled_jobs sj
  where sj.workflow_id = v_workflow.id;

  if v_old_job_id is not null then
    perform cron.unschedule(v_old_job_id);
  else
    -- If not tracked but exists in cron.job, remove it by name
    perform public.unschedule_workflow_job(v_workflow.id);
  end if;

  -- Build net.http_post command.
  -- Note: use format(%L) to safely quote JSON literals inside command text.
  v_headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer ' || v_service_role_key
  )::text;

  v_body := jsonb_build_object(
    'workflow_id', v_workflow.id,
    'triggered_by', 'cron',
    'initial_data', jsonb_build_object()
  )::text;

  v_command := format(
    $cmd$
      select net.http_post(
        url := %L,
        headers := %L::jsonb,
        body := %L::jsonb
      );
    $cmd$,
    v_project_url || '/functions/v1/execute-workflow',
    v_headers,
    v_body
  );

  -- Schedule with pg_cron
  v_job_id := cron.schedule(
    v_job_name,
    v_cron_expr,
    v_command
  );

  -- Upsert tracking row
  insert into public.scheduled_jobs (
    workflow_id,
    cron_expr,
    timezone,
    cron_job_id,
    cron_job_name
  )
  values (
    v_workflow.id,
    v_cron_expr,
    coalesce(v_timezone, 'UTC'),
    v_job_id,
    v_job_name
  )
  on conflict (workflow_id) do update
    set cron_expr = excluded.cron_expr,
        timezone = excluded.timezone,
        cron_job_id = excluded.cron_job_id,
        cron_job_name = excluded.cron_job_name,
        updated_at = now();
end;
$$;

comment on function public.sync_workflow_cron_job(uuid) is
  'Creates/updates/removes pg_cron schedule for a workflow based on active flag + cron-trigger config.';

-- Trigger function: sync cron whenever workflow row changes in relevant columns.
create or replace function public.handle_workflow_schedule_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Sync after insert/update when workflow may be schedulable.
  perform public.sync_workflow_cron_job(new.id);
  return new;
end;
$$;

comment on function public.handle_workflow_schedule_sync() is
  'AFTER INSERT/UPDATE trigger function to keep workflow cron schedule in sync.';

-- Remove stale trigger if exists and recreate.
drop trigger if exists workflows_schedule_sync on public.workflows;

create trigger workflows_schedule_sync
  after insert or update of active, nodes
  on public.workflows
  for each row
  execute procedure public.handle_workflow_schedule_sync();

-- Cleanup trigger: unschedule cron job when workflow is deleted.
create or replace function public.handle_workflow_schedule_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.unschedule_workflow_job(old.id);
  return old;
end;
$$;

comment on function public.handle_workflow_schedule_delete() is
  'AFTER DELETE trigger function to remove workflow cron schedule.';

drop trigger if exists workflows_schedule_delete on public.workflows;

create trigger workflows_schedule_delete
  after delete on public.workflows
  for each row
  execute procedure public.handle_workflow_schedule_delete();

-- ============================================================
-- OPTIONAL BACKFILL
-- Sync existing active workflows that already contain cron-trigger.
-- ============================================================
do $$
declare
  r record;
begin
  for r in
    select w.id
    from public.workflows w
    where w.active = true
  loop
    begin
      perform public.sync_workflow_cron_job(r.id);
    exception
      when others then
        -- Keep migration resilient: skip rows that cannot be scheduled yet.
        -- Common cause: app_settings keys not populated in this environment.
        raise notice 'Skipping cron sync for workflow %: %', r.id, sqlerrm;
    end;
  end loop;
end;
$$;
