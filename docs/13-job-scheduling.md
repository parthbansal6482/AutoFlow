# 13 — Job Scheduling

Scheduled workflows use cron-trigger nodes. When a workflow has a cron-trigger and is
set to active, it needs to fire automatically on a schedule — without any user action.

---

## How scheduling works (pg_cron + pg_net)

Both `pg_cron` and `pg_net` are Postgres extensions available in Supabase. Using them
means scheduling lives entirely inside the database — no external service needed.

```
1. User creates a workflow with a cron-trigger node
   e.g. cron expression: "0 9 * * 1-5"  (9am every weekday)
          ↓
2. User activates the workflow (sets active = true)
          ↓
3. App inserts a job into pg_cron:
   SELECT cron.schedule(
     'workflow-<id>',           -- job name (unique)
     '0 9 * * 1-5',            -- cron expression
     $$
     SELECT net.http_post(
       url := 'https://<project>.supabase.co/functions/v1/execute-workflow',
       body := '{"workflow_id": "<id>", "trigger_data": {}}'::jsonb,
       headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb
     )
     $$
   );
          ↓
4. At 9am on weekdays, pg_cron fires the SQL
5. pg_net makes the HTTP POST to execute-workflow
6. execute-workflow runs the workflow with triggered_by: 'cron'
```

---

## Minimum granularity

pg_cron has a minimum granularity of 1 minute. You cannot schedule a workflow to
run every 10 seconds using pg_cron. For sub-minute scheduling, use Inngest.

---

## Deactivating a scheduled workflow

When a workflow is set to inactive, the pg_cron job is removed:
```sql
SELECT cron.unschedule('workflow-<id>');
```

---

## Alternative: Inngest

Inngest is a serverless job queue that integrates with Edge Functions. It handles:
- Reliable delivery with retries
- Fan-out (running many jobs in parallel)
- Delays and sleeps inside workflows
- A dashboard to monitor jobs

To use Inngest instead of pg_cron:
1. Sign up at inngest.com
2. Register your `execute-workflow` Edge Function as an Inngest endpoint
3. Use the Inngest SDK to schedule runs
4. Inngest calls your function on schedule with full retry handling

Inngest is recommended for production if you need reliability guarantees beyond
what pg_cron provides.

---

## The `scheduled_jobs` table (reference)

A reference table that tracks which workflows have active cron jobs. This is used
to manage the pg_cron entries programmatically.

```
workflow_id   uuid        PK, FK → workflows(id)
cron_expr     text        the cron expression string
timezone      text        timezone for the schedule
created_at    timestamptz
```
