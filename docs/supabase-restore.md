# Supabase Restore Guide

Use this when the original Supabase project was deleted and MoneyApp needs a fresh backend.

## What can and cannot be restored

- The app schema can be restored from this repo.
- The app configuration can be restored from this repo.
- Old users, passwords, and row data cannot be recovered from code alone.
- If you have a Supabase backup or export, import that after rebuilding the schema.

## Step 1: Create a new Supabase project

1. Log in to Supabase.
2. Create a new project.
3. Wait for the database to finish provisioning.

## Step 2: Collect the API keys

In Supabase, open Project Settings > API and copy these values:

- Project URL
- anon public key
- service_role key

## Step 3: Rebuild local environment config

Create a local `.env.local` file in the repo root and fill in the values from `.env.example`.

Required for app boot:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Other variables can stay blank until you need those features.

## Step 4: Restore the main schema

In Supabase SQL Editor, run [multi_tenant_migration.sql](../multi_tenant_migration.sql).

That restores these tables:

- `cars`
- `car_expenses`
- `income`
- `expenses`
- `investments`
- `investment_rules`
- `distributions`

It also restores row-level security so each authenticated user only sees their own rows.

## Step 5: Restore the billing schema

In Supabase SQL Editor, run [billing_migration.sql](../billing_migration.sql).

That restores:

- `billing_profiles`

## Step 6: Enable auth

In Supabase Authentication:

1. Confirm Email provider is enabled.
2. Create a test user manually or sign up from the app.

## Step 7: Restart the app

From the repo root, start or restart the dev server:

```bash
npm run dev
```

If the server was already running, stop it first so it reloads the new environment variables.

## Step 8: Verify backend connectivity

Open these routes locally:

1. `/api/health`
2. `/login`
3. `/dashboard`
4. `/test`

Expected results:

- `/api/health` shows the Supabase env checks as `true`.
- `/login` lets you create or sign in to a user.
- `/dashboard` loads or shows a specific error instead of spinning forever.
- `/test` shows row counts for the signed-in user.

## Step 9: Re-enter data or import a backup

If the old project was deleted and you do not have a backup, you will need to recreate data manually.

Recommended order:

1. Create your user account.
2. Add cars.
3. Add car expenses.
4. Add general expenses.
5. Add income.
6. Add investments.
7. Add investment rules.

## Step 10: If something still fails

Check these first:

- `.env.local` contains the new Supabase keys.
- The dev server was restarted after env changes.
- Both SQL migration files were executed successfully.
- Email auth is enabled in Supabase.

If those are correct, open `/dashboard` and `/test` and use the displayed error message as the next debugging step.