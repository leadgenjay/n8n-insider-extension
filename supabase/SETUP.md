# Supabase Setup Guide for n8n AI Copilot

This guide walks you through setting up your Supabase backend for the n8n AI Copilot extension.

## Prerequisites

- [Supabase Account](https://supabase.com) (free tier works)
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- [Stripe Account](https://stripe.com) for payments
- Node.js 18+ and npm

## Step 1: Create Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Choose organization and set:
   - **Name**: n8n-ai-copilot
   - **Database Password**: Save this securely
   - **Region**: Choose closest to your users
4. Wait for project to initialize (~2 minutes)

## Step 2: Get Project Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Project API keys** → **anon/public** key
   - **Project API keys** → **service_role** key (keep secret!)
3. Save these in a `.env.local` file:

```bash
cp supabase/.env.example .env.local
# Edit .env.local with your values
```

## Step 3: Install Supabase CLI

```bash
npm install -g supabase

# Verify installation
supabase --version
```

## Step 4: Initialize Supabase Locally (Optional)

For local development, you can run Supabase locally:

```bash
# Initialize Supabase in your project
supabase init

# Start local Supabase (Docker required)
supabase start

# This will create a local instance at http://localhost:54321
```

## Step 5: Link to Remote Project

```bash
# Link CLI to your remote project
supabase link --project-ref YOUR_PROJECT_REF

# Get your project ref from the Project URL:
# https://YOUR_PROJECT_REF.supabase.co
```

## Step 6: Apply Database Migrations

### Option A: Using the Script (Recommended)

```bash
cd /Volumes/data/GITHUB/N8N-Chrome
chmod +x supabase/apply-migrations.sh
./supabase/apply-migrations.sh
```

### Option B: Manual via CLI

```bash
# Apply all migrations
supabase db push

# Or apply individually
supabase db push --file supabase/migrations/20250101000001_create_profiles_table.sql
supabase db push --file supabase/migrations/20250101000002_create_profile_trigger.sql
# ... etc
```

### Option C: Via Supabase Dashboard

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy content of each migration file in order
3. Paste and run each one

**Order is important**:
1. `20250101000001_create_profiles_table.sql`
2. `20250101000002_create_profile_trigger.sql`
3. `20250101000003_create_conversations_table.sql`
4. `20250101000004_create_messages_table.sql`
5. `20250101000005_create_workflow_snapshots_table.sql`
6. `20250101000006_create_recent_messages_view.sql`
7. `20250101000007_security_fixes.sql` (CRITICAL for security)

## Step 7: Verify Schema

Run the test script to verify everything is set up correctly:

```bash
supabase db push --file supabase/migrations/test_schema.sql
```

Or check manually:

```sql
-- In SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should return:
-- conversations
-- messages
-- profile_audit_log
-- profiles
-- workflow_snapshots
-- recent_messages (view)
```

## Step 8: Configure Authentication

### Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Configure email templates (optional)

### Enable Google OAuth

1. In **Authentication** → **Providers**, click **Google**
2. Create OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable **Google+ API**
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
3. Copy **Client ID** and **Client Secret** to Supabase
4. Click **Save**

### Test Authentication

```typescript
// In your extension code
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
)

// Test email signup
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'secure-password-123'
})

console.log('User created:', data.user?.id)
```

## Step 9: Set Up Stripe Webhook

### Create Stripe Product

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. **Products** → **Add Product**:
   - **Name**: n8n AI Copilot Pro (Lifetime)
   - **Description**: Lifetime access to Pro features
   - **Pricing**: One-time payment (e.g., $99)
   - **Price ID**: Copy this (e.g., `price_1234...`)

### Create Payment Link

1. In Stripe, go to **Payment Links** → **New**
2. Select your product
3. Under **After payment**, set:
   - **Redirect URL**: Your extension success page
4. Click **Create Link**
5. Copy the payment link URL

### Deploy Webhook Edge Function

```bash
# Deploy the Stripe webhook function
supabase functions deploy stripe-webhook \
  --no-verify-jwt \
  --project-ref YOUR_PROJECT_REF

# Set environment secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_your-key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Register Webhook in Stripe

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL**: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
3. **Events to send**:
   - `checkout.session.completed`
   - `charge.refunded`
4. Click **Add endpoint**
5. Copy **Signing secret** (starts with `whsec_`)
6. Update your Edge Function secrets:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your-secret
```

### Test Webhook

```bash
# Use Stripe CLI to test locally
stripe listen --forward-to https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook

# Trigger test event
stripe trigger checkout.session.completed
```

## Step 10: Generate TypeScript Types

```bash
# Generate types from your schema
supabase gen types typescript --local > src/types/supabase.ts

# Or for remote project
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/supabase.ts
```

## Step 11: Test RLS Policies

Create test users and verify security:

```sql
-- Create test user A
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'user-a@test.com',
  crypt('password123', gen_salt('bf')),
  now()
);

-- Create test user B
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'user-b@test.com',
  crypt('password123', gen_salt('bf')),
  now()
);

-- Set session to user A
SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001"}', true);

-- Try to read user B's profile (should return 0 rows)
SELECT * FROM profiles WHERE id = '00000000-0000-0000-0000-000000000002';

-- Verify can read own profile
SELECT * FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001';
```

## Step 12: Seed Development Data (Optional)

```bash
# Load seed data for testing
supabase db push --file supabase/seed.sql
```

## Common Issues

### Issue: Migrations fail with "relation already exists"

**Solution**: You may have applied migrations before. To reset:

```sql
-- DANGER: This drops all tables
\i supabase/migrations/rollback.sql
```

Then re-apply migrations.

### Issue: RLS blocking queries

**Solution**: Check your policies:

```sql
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

Verify `auth.uid()` matches the user_id in your queries.

### Issue: Webhook not receiving events

**Solution**:
1. Check Edge Function logs: `supabase functions logs stripe-webhook`
2. Verify webhook secret matches Stripe
3. Test with Stripe CLI: `stripe listen --forward-to ...`

## Security Checklist

Before going to production:

- [ ] All migrations applied including `20250101000007_security_fixes.sql`
- [ ] RLS enabled on all tables
- [ ] Service role key is secret (not in client code)
- [ ] Stripe webhook signature verification enabled
- [ ] Google OAuth configured with correct redirect URI
- [ ] Environment variables secured in Edge Functions
- [ ] Database password is strong and saved securely

## Next Steps

1. Build the Chrome extension UI
2. Implement Supabase client in extension
3. Test authentication flow
4. Integrate Stripe payment link
5. Test full user journey: signup → chat → upgrade → unlock features

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
