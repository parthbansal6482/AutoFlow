# 18 — Supabase Cloud Integration Guide

This guide explains how to manage your Supabase Cloud project, use the updated CLI commands, and configure OAuth providers for both **Application Login** and **Workflow Integrations**.

---

## 🚀 Supabase CLI Commands

We have updated the root `package.json` with cloud-focused scripts to replace local development commands. 

| Command | Action | Description |
| :--- | :--- | :--- |
| `pnpm sb:deploy` | `supabase functions deploy` | Deploys all local Edge Functions to your Supabase Cloud project. |
| `pnpm sb:secrets` | `supabase secrets set --env-file ...` | Pushes your local `supabase/functions/.env` keys to your Cloud project. |
| `pnpm sb:migrate` | `supabase db push` | Pushes your local database schema/migrations to the Cloud database. |

> [!IMPORTANT]
> **Encryption Key**: When switching to a new Supabase project, you **must** ensure your `ENCRYPTION_KEY` is set in the cloud secrets using `pnpm sb:secrets`. Without this, the app cannot decrypt existing credentials.

---

## 📂 OAuth Configuration: Two Different Systems

Your project uses OAuth in two distinct ways. You must configure them separately in your provider settings (Google/GitHub/etc.).

### 1. Application Login (Authentication)
*   **Purpose**: Allows users to log in to your dashboard.
*   **Managed by**: Supabase Auth (built-in).
*   **Redirect URI**: `https://<project-ref>.supabase.co/auth/v1/callback`
*   **Setup**: [Supabase Dashboard > Authentication > Providers](https://supabase.com/dashboard/project/_/auth/providers).

### 2. Workflow Integrations (Credentials)
*   **Purpose**: Allows your automation engine to act on behalf of users (e.g., read Google Sheets).
*   **Managed by**: Custom Edge Functions (`oauth-callback`).
*   **Redirect URI**: `https://<project-ref>.supabase.co/functions/v1/oauth-callback`
*   **Setup**: Added to `supabase/functions/.env` and pushed via `pnpm sb:secrets`.

---

## 🛠️ Adding New Workflow Integrations

To add a new integration (e.g., Slack or Notion), follow these steps:

### 1. Create the External App
Go to the provider's developer console and create an OAuth 2.0 app.
*   **Redirect URI**: Must be `https://hvaxmrwghjwecqownrna.supabase.co/functions/v1/oauth-callback`.

### 2. Update Environment Variables
Add the Client ID and Secret to your [supabase/functions/.env](file:///Users/parthbansal/Projects/Workflow Automation/supabase/functions/.env) file using the correct prefix:

```env
# Google
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# GitHub
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Slack
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...

# Notion
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
```

### 3. Push to Cloud
Run the following command to make these keys available to your cloud functions:
```bash
pnpm sb:secrets
```

---

## 📑 Provider-Specific Redirects Reference

| Provider | Redirect URI | Settings Location |
| :--- | :--- | :--- |
| **GitHub** | `.../functions/v1/oauth-callback` | [GitHub Developer Settings](https://github.com/settings/developers) |
| **Google** | `.../functions/v1/oauth-callback` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| **Slack** | `.../functions/v1/oauth-callback` | [Slack API Dashboard](https://api.slack.com/apps) |
| **Notion** | `.../functions/v1/oauth-callback` | [Notion My Integrations](https://www.notion.so/my-integrations) |

> [!TIP]
> **Local Testing**: If you are testing the **frontend** locally, your `OAUTH_SUCCESS_REDIRECT_URL` in the `.env` should point to `http://localhost:5173/credentials` so the browser returns to your local dev server after the cloud function finishes the OAuth exchange.
