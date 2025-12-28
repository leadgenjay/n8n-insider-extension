# Supabase Database Migrations

This directory contains all database schema migrations for the n8n AI Copilot extension.

## Migration Files

| Migration | Description | Dependencies |
|-----------|-------------|--------------|
| `20250101000001_create_profiles_table.sql` | User profiles extending auth.users | auth.users (built-in) |
| `20250101000002_create_profile_trigger.sql` | Auto-create profile on signup | profiles table |
| `20250101000003_create_conversations_table.sql` | Chat conversation sessions | profiles table |
| `20250101000004_create_messages_table.sql` | Individual chat messages | conversations, profiles |
| `20250101000005_create_workflow_snapshots_table.sql` | Workflow backup snapshots | profiles table |
| `20250101000006_create_recent_messages_view.sql` | 7-day message retention view | messages table |

## Applying Migrations

### Option 1: Supabase CLI (Recommended)

```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref <your-project-ref>

# Apply all migrations
supabase db push

# Or apply individually
supabase db push --file supabase/migrations/20250101000001_create_profiles_table.sql
```

### Option 2: Supabase Dashboard

1. Go to your project in the Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file in order
4. Execute them sequentially

### Option 3: Direct SQL Connection

```bash
# Using psql
psql postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres \
  -f supabase/migrations/20250101000001_create_profiles_table.sql

# Repeat for each migration in order
```

## Schema Overview

### Tables

#### profiles
- **Purpose**: Extends auth.users with app-specific data
- **RLS**: Users can view/update their own profile only
- **Key Fields**: is_lifetime (Pro status), stripe_customer_id, usage_count

#### conversations
- **Purpose**: Groups messages into chat sessions
- **RLS**: Users can only access their own conversations
- **Indexes**: Optimized for listing recent conversations

#### messages
- **Purpose**: Individual chat messages
- **RLS**: Users can only access their own messages
- **7-Day Retention**: Use `recent_messages` view for filtered queries
- **Indexes**: Optimized for chronological message fetching

#### workflow_snapshots
- **Purpose**: Backup workflows before AI modifications
- **RLS**: Users can only access their own snapshots
- **Indexes**: Optimized for finding latest snapshot per workflow

### Views

#### recent_messages
- **Purpose**: Show only messages from last 7 days
- **Implementation**: Query-time filtering (no scheduled deletion)
- **RLS**: Inherits from messages table

## Row Level Security (RLS)

All tables have RLS enabled with the following pattern:

```sql
-- Users can only access their own data
using (auth.uid() = user_id)
```

This ensures:
- No user can see another user's data
- Even if the client is compromised, the database enforces security
- Supabase client automatically filters queries based on authenticated user

## Performance Considerations

### Indexes Created
- `idx_conversations_user_created`: Fast conversation listing
- `idx_messages_conversation`: Fast message retrieval within conversation
- `idx_messages_created_at`: Optimize 7-day filtering
- `idx_snapshots_user_workflow`: Fast snapshot lookup by workflow

### Query Patterns
```sql
-- Fetch recent conversations
SELECT * FROM conversations
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 20;

-- Fetch messages in a conversation
SELECT * FROM messages
WHERE conversation_id = $1
ORDER BY created_at ASC;

-- Fetch only recent messages
SELECT * FROM recent_messages
WHERE conversation_id = $1;

-- Find latest snapshot for a workflow
SELECT * FROM workflow_snapshots
WHERE user_id = auth.uid()
  AND n8n_workflow_id = $1
ORDER BY created_at DESC
LIMIT 1;
```

## Testing Migrations

After applying migrations, verify:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- Verify indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Test trigger
INSERT INTO auth.users (id, email) VALUES (gen_random_uuid(), 'test@example.com');
SELECT * FROM profiles WHERE email = 'test@example.com';
```

## Rollback

If you need to rollback migrations, use the rollback file:

```bash
supabase db push --file supabase/migrations/rollback.sql
```

## TypeScript Type Generation

After applying migrations, generate TypeScript types:

```bash
# Generate types for your Supabase schema
supabase gen types typescript --local > src/types/supabase.ts

# Or for remote project
supabase gen types typescript --project-id <your-project-ref> > src/types/supabase.ts
```

## Next Steps

1. Apply migrations using your preferred method
2. Generate TypeScript types
3. Test RLS policies with different user contexts
4. Set up Stripe webhook Edge Function
5. Configure Supabase Auth providers (Google OAuth)

## Security Notes

- All tables have RLS enabled - NEVER disable it in production
- Service role key bypasses RLS - only use in secure Edge Functions
- Stripe webhook function needs service role to update profiles
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret and never expose to client
