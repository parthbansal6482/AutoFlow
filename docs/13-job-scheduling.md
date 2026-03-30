# 13 — Job Scheduling

Scheduled workflows are now implemented with **Postgres-native scheduling** using
`pg_cron` + `pg_net`, and are managed automatically through database triggers.

This document reflects the current implementation introduced by:

- `supabase/migrations/0002_cron_scheduling.sql`

---

## What is implemented

## 1) `scheduled_jobs` tracking table

A new table tracks the schedule state for each workflow:

- `workflow_id` (PK, FK → `workflows.id`)
- `cron_expr`
- `timezone`
- `cron_job_id` (from `cron.schedule`)
- `cron_job_name` (deterministic: `workflow-<workflow_id>`)
- timestamps

This table is the source of truth for schedule metadata at the application layer.

---

## 2) Automatic schedule sync on workflow changes

Schedules are synchronized automatically when workflows change:

- Trigger on `workflows`:
  - `AFTER INSERT OR UPDATE OF active, nodes`
  - calls `public.handle_workflow_schedule_sync()`
  - which calls `public.sync_workflow_cron_job(workflow_id)`

- Trigger on `workflows` delete:
  - `AFTER DELETE`
  - calls `public.handle_workflow_schedule_delete()`
  - which unschedules and cleans up tracking rows

This means you do **not** need a separate backend worker for cron activation logic.

---

## 3) Cron config extraction from workflow JSON

Cron settings are read from the first node with `type = 'cron-trigger'` in `workflows.nodes`.

Implemented helper:

- `public.get_workflow_cron_config(nodes jsonb)`
  - returns:
    - `cron_expr`
    - `timezone` (defaults to `'UTC'`)

If workflow is inactive or has no valid cron expression, scheduling is removed.

---

## 4) Scheduling and unscheduling helpers

Implemented SQL functions:

- `public.workflow_cron_job_name(workflow_id uuid) -> text`
- `public.unschedule_workflow_job(workflow_id uuid) -> void`
- `public.sync_workflow_cron_job(workflow_id uuid) -> void`

`sync_workflow_cron_job` behavior:

1. Load workflow
2. Read cron trigger config from JSON nodes
3. If inactive or invalid cron: unschedule existing job + delete tracking row
4. If active + valid cron:
   - unschedule previous job if needed
   - create new `cron.schedule(...)` entry
   - upsert `scheduled_jobs`

---

## 5) Execution target

Scheduled job command uses `pg_net` to POST to:

- `https://<project>/functions/v1/execute-workflow`

Payload:

```Workflow Automation/docs/13-job-scheduling.md#L90-98
{
  "workflow_id": "<workflow-id>",
  "triggered_by": "cron",
  "initial_data": {}
}
```

Headers include:

- `Content-Type: application/json`
- `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`

---

## 6) Required `app_settings` keys

A new `app_settings` table is used for DB-side scheduling configuration.
The scheduling function requires **both** keys below:

- `SUPABASE_PROJECT_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If either is missing, scheduling raises a clear exception and does not create cron jobs.

---

## Required setup after migration

Run these SQL statements once per environment (local/staging/prod):

```Workflow Automation/docs/13-job-scheduling.md#L113-122
insert into public.app_settings(key, value)
values
  ('SUPABASE_PROJECT_URL', 'https://<your-project-ref>.supabase.co'),
  ('SUPABASE_SERVICE_ROLE_KEY', '<your-service-role-key>')
on conflict (key) do update
set value = excluded.value,
    updated_at = now();
```

> Security note: service role key in DB settings is highly privileged.
> Restrict access tightly and never expose this table to frontend clients.

---

## Activation lifecycle (implemented)

## When workflow becomes active with cron-trigger

- Trigger fires
- `sync_workflow_cron_job` schedules job in `pg_cron`
- `scheduled_jobs` row is inserted/updated

## When cron expression/timezone changes in node config

- Trigger fires on `nodes` update
- old cron job is unscheduled
- new cron job is scheduled
- `scheduled_jobs` row updated

## When workflow becomes inactive

- Trigger fires
- cron job unscheduled
- `scheduled_jobs` row removed

## When workflow is deleted

- delete trigger fires
- cron job unscheduled
- tracking row removed

---

## Backfill behavior

Migration includes a backfill block that attempts to sync all currently active workflows.

- If required app settings are missing, it skips that workflow and emits a notice.
- This keeps migration resilient in partially configured environments.

---

## RLS and ownership

RLS is enabled for `scheduled_jobs` and tied to workflow ownership through `workflows.user_id`.

Users can only view/manage schedules for their own workflows under normal JWT access.

---

## Operational notes

- Minimum schedule granularity remains **1 minute** (`pg_cron` limitation).
- Timezone is currently stored and tracked in `scheduled_jobs`.
- If cron syntax is invalid, scheduling call fails at `cron.schedule`.
- Re-running `sync_workflow_cron_job(workflow_id)` is safe and idempotent in practice.

---

## Quick verification checklist

1. Confirm extensions are enabled (`pg_cron`, `pg_net`).
2. Confirm `app_settings` has both required keys.
3. Create/update a workflow:
   - `active = true`
   - includes `cron-trigger` node with valid cron.
4. Check:
   - row exists in `public.scheduled_jobs`
   - corresponding entry exists in `cron.job`
5. Wait for schedule tick and verify new row in `executions` with:
   - `triggered_by = 'cron'`

---

## Troubleshooting

## Error: missing app settings keys
Add both required keys to `public.app_settings` and re-sync:

```Workflow Automation/docs/13-job-scheduling.md#L190-192
select public.sync_workflow_cron_job('<workflow-id>'::uuid);
```

## Workflow active but no cron job exists
- ensure node type is exactly `cron-trigger`
- ensure `parameters.cron` is non-empty
- confirm migration `0002_cron_scheduling.sql` has been applied

## Cron job exists but workflow does not execute
- verify `SUPABASE_PROJECT_URL` correctness
- verify `SUPABASE_SERVICE_ROLE_KEY` validity
- inspect `cron.job_run_details` for failures
- check Edge Function logs for `execute-workflow`

---

## Summary

Job scheduling is now fully wired in backend via SQL migration and triggers.
Activation/deactivation is automatic, persistent, and linked directly to workflow state.
The only manual requirement is configuring `app_settings` with project URL + service role key.