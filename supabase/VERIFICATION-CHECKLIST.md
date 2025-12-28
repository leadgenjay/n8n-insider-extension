# Supabase Setup Verification Checklist

Use this checklist to verify your Supabase database is correctly configured.

## Phase 1: Migrations Applied

Run these queries in SQL Editor to verify:

### Check Tables Exist
```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'profiles',
    'conversations',
    'messages',
    'workflow_snapshots',
    'profile_audit_log'
  )
ORDER BY table_name;
```

**Expected Result**: 5 tables

- [ ] profiles
- [ ] conversations
- [ ] messages
- [ ] workflow_snapshots
- [ ] profile_audit_log

### Check Views Exist
```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'recent_messages';
```

**Expected Result**: 1 view

- [ ] recent_messages

## Phase 2: RLS Enabled

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles',
    'conversations',
    'messages',
    'workflow_snapshots',
    'profile_audit_log'
  );
```

**Expected Result**: All should show `rowsecurity = true`

- [ ] profiles: RLS enabled
- [ ] conversations: RLS enabled
- [ ] messages: RLS enabled
- [ ] workflow_snapshots: RLS enabled
- [ ] profile_audit_log: RLS enabled

## Phase 3: Policies Exist

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected Result**: At least 7 policies

- [ ] profiles: "Users can view own profile" (SELECT)
- [ ] profiles: "Users can update own profile (restricted)" (UPDATE)
- [ ] conversations: "Users can manage own conversations" (ALL)
- [ ] messages: "Users can manage own messages" (ALL)
- [ ] workflow_snapshots: "Users can manage own snapshots" (ALL)
- [ ] profile_audit_log: "Users can view own audit log" (SELECT)

## Phase 4: Indexes Created

```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'conversations',
    'messages',
    'workflow_snapshots',
    'profile_audit_log'
  )
ORDER BY tablename, indexname;
```

**Expected Result**: At least 5 indexes

- [ ] idx_conversations_user_created
- [ ] idx_messages_conversation
- [ ] idx_messages_created_at
- [ ] idx_snapshots_user_workflow
- [ ] idx_audit_log_profile

## Phase 5: Triggers and Functions

### Check Triggers
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;
```

**Expected Result**: 2 triggers

- [ ] on_auth_user_created (on auth.users)
- [ ] profile_changes_audit (on profiles)

### Check Functions
```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'handle_new_user',
    'update_profile_email',
    'log_profile_changes'
  )
ORDER BY routine_name;
```

**Expected Result**: 3 functions

- [ ] handle_new_user
- [ ] update_profile_email
- [ ] log_profile_changes

## Phase 6: Constraints

### Check Foreign Keys
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

**Expected Result**: At least 7 foreign keys

- [ ] profiles.id → auth.users.id
- [ ] conversations.user_id → profiles.id
- [ ] messages.conversation_id → conversations.id
- [ ] messages.user_id → profiles.id
- [ ] workflow_snapshots.user_id → profiles.id
- [ ] profile_audit_log.profile_id → profiles.id

### Check Constraints
```sql
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

**Expected Result**: At least 3 check constraints

- [ ] messages: role in ('user', 'assistant', 'system')
- [ ] messages: user owns conversation
- [ ] workflow_snapshots: workflow_json size < 1MB

## Phase 7: Functional Testing

### Test 1: Profile Auto-Creation

**IMPORTANT**: This test requires creating a real test user via Auth UI or client.

```typescript
// In your extension or test environment
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Sign up test user
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'test-password-123'
})

// Check if profile was auto-created
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', data.user.id)
  .single()

console.log('Profile created:', profile)
```

- [ ] Signing up creates profile automatically
- [ ] Profile has correct email
- [ ] is_lifetime defaults to false
- [ ] usage_count defaults to 0

### Test 2: RLS Protection

Create two test users and verify RLS works:

```sql
-- As user A (set in auth context)
-- Should return 0 rows when trying to access user B's data
SELECT * FROM profiles WHERE id = '<user-b-id>';
SELECT * FROM conversations WHERE user_id = '<user-b-id>';
SELECT * FROM messages WHERE user_id = '<user-b-id>';
```

- [ ] User A cannot see user B's profile
- [ ] User A cannot see user B's conversations
- [ ] User A cannot see user B's messages

### Test 3: Profile Update Protection

```sql
-- Try to update is_lifetime (should fail due to WITH CHECK)
UPDATE profiles
SET is_lifetime = true
WHERE id = auth.uid();

-- Expected: Error or no update (depends on implementation)
```

- [ ] Cannot manually set is_lifetime to true
- [ ] Cannot manually update stripe_customer_id

### Test 4: Safe Update Function

```sql
-- Should succeed
SELECT update_profile_email('newemail@example.com');

-- Verify
SELECT email FROM profiles WHERE id = auth.uid();
```

- [ ] update_profile_email() works
- [ ] Email is updated
- [ ] is_lifetime remains unchanged

### Test 5: Conversation and Messages

```typescript
// Create conversation
const { data: conv } = await supabase
  .from('conversations')
  .insert({ user_id: user.id, title: 'Test Chat' })
  .select()
  .single()

// Add message
const { data: msg } = await supabase
  .from('messages')
  .insert({
    conversation_id: conv.id,
    user_id: user.id,
    role: 'user',
    content: 'Hello AI'
  })
  .select()
  .single()

// Fetch messages
const { data: messages } = await supabase
  .from('messages')
  .select('*')
  .eq('conversation_id', conv.id)
```

- [ ] Can create conversation
- [ ] Can add messages to conversation
- [ ] Can fetch messages in conversation
- [ ] Messages ordered by created_at

### Test 6: Recent Messages View

```typescript
const { data: recentMessages } = await supabase
  .from('recent_messages')
  .select('*')
  .eq('conversation_id', conv.id)
```

- [ ] recent_messages view works
- [ ] Only shows messages from last 7 days

### Test 7: Workflow Snapshots

```typescript
const { data: snapshot } = await supabase
  .from('workflow_snapshots')
  .insert({
    user_id: user.id,
    n8n_workflow_id: 'test_workflow_123',
    workflow_json: {
      name: 'Test Workflow',
      nodes: [],
      connections: {}
    }
  })
  .select()
  .single()

// Fetch latest
const { data: latest } = await supabase
  .from('workflow_snapshots')
  .select('*')
  .eq('user_id', user.id)
  .eq('n8n_workflow_id', 'test_workflow_123')
  .order('created_at', { ascending: false })
  .limit(1)
  .single()
```

- [ ] Can create workflow snapshot
- [ ] Can retrieve latest snapshot by workflow_id
- [ ] workflow_json stored correctly

### Test 8: Audit Logging

This requires service role access (simulate Stripe webhook):

```typescript
// Using service role key
const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

await supabaseAdmin
  .from('profiles')
  .update({
    is_lifetime: true,
    stripe_customer_id: 'cus_test123'
  })
  .eq('id', user.id)

// Check audit log
const { data: auditLogs } = await supabase
  .from('profile_audit_log')
  .select('*')
  .eq('profile_id', user.id)
```

- [ ] Audit log entry created
- [ ] changed_fields contains is_lifetime and stripe_customer_id
- [ ] changed_at is correct

## Phase 8: Authentication Configuration

### Email Auth
- [ ] Email provider enabled in Supabase Dashboard
- [ ] Email confirmation emails working (check spam)
- [ ] Password reset flow working

### Google OAuth
- [ ] Google OAuth provider configured
- [ ] OAuth credentials added to Supabase
- [ ] Redirect URI set correctly: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
- [ ] Test Google login works

## Phase 9: Stripe Integration (When Ready)

### Edge Function Deployed
- [ ] `stripe-webhook` Edge Function deployed
- [ ] Function URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`
- [ ] Secrets configured (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, etc.)

### Webhook Registered in Stripe
- [ ] Webhook endpoint added in Stripe Dashboard
- [ ] Events configured: checkout.session.completed, charge.refunded
- [ ] Signing secret saved and configured in Edge Function

### Test Payment Flow
- [ ] Create test payment with Stripe test mode
- [ ] Webhook fires and reaches Edge Function
- [ ] User profile updated to is_lifetime = true
- [ ] Audit log entry created

## Phase 10: TypeScript Types

```bash
# Generate types
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/supabase.ts
```

- [ ] Types generated successfully
- [ ] File created at src/types/supabase.ts
- [ ] Types include all tables (profiles, conversations, messages, etc.)
- [ ] No TypeScript errors when importing types

## Phase 11: Performance Verification

Run these to check index usage:

```sql
-- Explain query plan for conversation listing
EXPLAIN ANALYZE
SELECT * FROM conversations
WHERE user_id = '<test-user-id>'
ORDER BY created_at DESC
LIMIT 20;

-- Should use idx_conversations_user_created index
```

- [ ] Index scan on idx_conversations_user_created
- [ ] Query time < 50ms

```sql
-- Explain query plan for message fetching
EXPLAIN ANALYZE
SELECT * FROM messages
WHERE conversation_id = '<test-conversation-id>'
ORDER BY created_at ASC;

-- Should use idx_messages_conversation index
```

- [ ] Index scan on idx_messages_conversation
- [ ] Query time < 50ms

## Phase 12: Security Hardening

- [ ] Service role key NOT exposed to client code
- [ ] Anon key used in extension (safe to expose)
- [ ] All migrations applied including 20250101000007_security_fixes.sql
- [ ] Database password is strong and saved securely
- [ ] No test data in production database

## Phase 13: Backup & Recovery

- [ ] Understand backup strategy (Supabase automatic backups)
- [ ] Test backup/restore process (if on Pro tier)
- [ ] Document recovery procedures

## Summary Checklist

Quick verification:

```bash
# Count tables
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'; -- Should be 5

# Count RLS policies
SELECT COUNT(*) FROM pg_policies
WHERE schemaname = 'public'; -- Should be at least 7

# Count indexes
SELECT COUNT(*) FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('conversations', 'messages', 'workflow_snapshots', 'profile_audit_log');
-- Should be at least 5

# Count functions
SELECT COUNT(*) FROM information_schema.routines
WHERE routine_schema = 'public'; -- Should be at least 3
```

## Final Sign-Off

- [ ] All Phase 1-7 checks passed
- [ ] Authentication configured and tested
- [ ] TypeScript types generated
- [ ] Performance verified
- [ ] Security hardened
- [ ] Ready for integration with Chrome extension

---

**Date Verified**: ___________
**Verified By**: ___________
**Issues Found**: ___________
**Status**: [ ] READY [ ] NEEDS FIXES
