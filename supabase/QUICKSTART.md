# Supabase Quick Start (5 Minutes)

This is the fastest way to get your Supabase database up and running.

## Prerequisites

- Supabase account (free tier works)
- Supabase CLI installed: `npm install -g supabase`

## Step 1: Create Project (2 min)

1. Go to https://app.supabase.com
2. Click "New Project"
3. Set name: `n8n-ai-copilot`
4. Save the database password somewhere safe
5. Wait for project to initialize

## Step 2: Get Credentials (1 min)

1. Go to **Settings** → **API**
2. Copy these values to `/Volumes/data/GITHUB/N8N-Chrome/.env.local`:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 3: Apply Migrations (2 min)

### Option A: Automated Script

```bash
cd /Volumes/data/GITHUB/N8N-Chrome
chmod +x supabase/apply-migrations.sh
./supabase/apply-migrations.sh
```

### Option B: Manual via Dashboard

1. Go to **SQL Editor** in Supabase dashboard
2. Copy contents of each file in this order:

```bash
# Run these in order (copy/paste into SQL Editor):
supabase/migrations/20250101000001_create_profiles_table.sql
supabase/migrations/20250101000002_create_profile_trigger.sql
supabase/migrations/20250101000003_create_conversations_table.sql
supabase/migrations/20250101000004_create_messages_table.sql
supabase/migrations/20250101000005_create_workflow_snapshots_table.sql
supabase/migrations/20250101000006_create_recent_messages_view.sql
supabase/migrations/20250101000007_security_fixes.sql  # CRITICAL!
```

## Verify Setup

Run this in SQL Editor:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- conversations
- messages
- profile_audit_log
- profiles
- workflow_snapshots

## Enable Google OAuth (Optional)

1. Go to **Authentication** → **Providers**
2. Enable **Google**
3. Follow instructions to add OAuth credentials
4. Set redirect URI: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

## That's It!

Your database is ready. Next:

1. Generate types: `supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/supabase.ts`
2. Build your extension using examples in `INTEGRATION.md`
3. Set up Stripe webhook when ready for payments

## Need Help?

- Full setup guide: `SETUP.md`
- Integration examples: `INTEGRATION.md`
- Security details: `RLS-SECURITY-ANALYSIS.md`
