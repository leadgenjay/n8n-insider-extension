# Database Schema Diagram

## Entity Relationship Diagram

```sql
┌─────────────────────────────────────────────────────────────────────────┐
│                        auth.users (Supabase Built-in)                   │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ id (uuid, PK)                                                   │    │
│  │ email (text)                                                    │    │
│  │ encrypted_password (text)                                       │    │
│  │ email_confirmed_at (timestamptz)                                │    │
│  └────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ ON INSERT (trigger: on_auth_user_created)
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           public.profiles                                │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ id (uuid, PK, FK → auth.users.id)                              │    │
│  │ email (text)                                                    │    │
│  │ is_lifetime (boolean, default: false)  ⚠️ PROTECTED            │    │
│  │ stripe_customer_id (text)              ⚠️ PROTECTED            │    │
│  │ usage_count (integer, default: 0)                              │    │
│  │ created_at (timestamptz, default: now())                        │    │
│  │ updated_at (timestamptz, default: now())                        │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  RLS: Users can SELECT/UPDATE own profile (restricted)                  │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ ON UPDATE (trigger: profile_changes_audit)
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       public.profile_audit_log                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ id (uuid, PK)                                                   │    │
│  │ profile_id (uuid, FK → profiles.id)                             │    │
│  │ changed_fields (jsonb)                                          │    │
│  │ changed_by (uuid)                                               │    │
│  │ changed_at (timestamptz, default: now())                        │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  RLS: Users can SELECT own audit logs                                   │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        public.conversations                              │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ id (uuid, PK, default: gen_random_uuid())                       │    │
│  │ user_id (uuid, FK → profiles.id, CASCADE DELETE)                │    │
│  │ title (text, default: 'New Conversation')                       │    │
│  │ created_at (timestamptz, default: now())                        │    │
│  │ updated_at (timestamptz, default: now())                        │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  RLS: Users can manage (ALL) own conversations                          │
│  INDEX: idx_conversations_user_created (user_id, created_at DESC)       │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          public.messages                                 │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ id (uuid, PK, default: gen_random_uuid())                       │    │
│  │ conversation_id (uuid, FK → conversations.id, CASCADE DELETE)   │    │
│  │ user_id (uuid, FK → profiles.id, CASCADE DELETE)                │    │
│  │ role (text, CHECK: 'user' | 'assistant' | 'system')             │    │
│  │ content (text, NOT NULL)                                        │    │
│  │ metadata (jsonb, default: {})                                   │    │
│  │ created_at (timestamptz, default: now())                        │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  RLS: Users can manage (ALL) own messages                               │
│  CONSTRAINT: user_id must match conversation owner                      │
│  INDEX: idx_messages_conversation (conversation_id, created_at ASC)     │
│  INDEX: idx_messages_created_at (created_at DESC)                       │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Filtered by created_at
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    public.recent_messages (VIEW)                         │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ SELECT * FROM messages                                          │    │
│  │ WHERE created_at > now() - interval '7 days'                    │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  RLS: Inherits from messages table                                      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      public.workflow_snapshots                           │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │ id (uuid, PK, default: gen_random_uuid())                       │    │
│  │ user_id (uuid, FK → profiles.id, CASCADE DELETE)                │    │
│  │ n8n_workflow_id (text, NOT NULL)                                │    │
│  │ workflow_json (jsonb, NOT NULL, max 1MB)                        │    │
│  │ created_at (timestamptz, default: now())                        │    │
│  └────────────────────────────────────────────────────────────────┘    │
│  RLS: Users can manage (ALL) own snapshots                              │
│  CONSTRAINT: workflow_json size < 1MB                                   │
│  INDEX: idx_snapshots_user_workflow (user_id, n8n_workflow_id, ...)    │
└─────────────────────────────────────────────────────────────────────────┘
```

## Data Flow

### User Signup Flow
```sql
1. User signs up via Supabase Auth
   ↓
2. INSERT into auth.users (automatic)
   ↓
3. Trigger: on_auth_user_created fires
   ↓
4. Function: handle_new_user() executes
   ↓
5. INSERT into public.profiles (id, email)
   ↓
6. User profile ready
```

### Payment Flow (Stripe Webhook)
```sql
1. User completes Stripe checkout
   ↓
2. Stripe sends webhook to Edge Function
   ↓
3. Verify webhook signature
   ↓
4. Extract user_id from session.client_reference_id
   ↓
5. UPDATE profiles SET is_lifetime = true (via service role)
   ↓
6. Trigger: profile_changes_audit fires
   ↓
7. INSERT into profile_audit_log (tracking change)
   ↓
8. User upgraded to Pro
```

### Chat Flow
```sql
1. User opens extension
   ↓
2. Load conversations: SELECT * FROM conversations WHERE user_id = auth.uid()
   ↓
3. User selects conversation
   ↓
4. Load messages: SELECT * FROM messages WHERE conversation_id = $1
   ↓
5. User sends message
   ↓
6. INSERT into messages (role: 'user', content: '...')
   ↓
7. Call AI (OpenRouter)
   ↓
8. INSERT into messages (role: 'assistant', content: '...')
   ↓
9. Display response
```

### Workflow Snapshot Flow
```sql
1. User clicks "Fix it for me" (Pro feature)
   ↓
2. Check: SELECT is_lifetime FROM profiles WHERE id = auth.uid()
   ↓
3. If Pro: Fetch current workflow from n8n API
   ↓
4. INSERT into workflow_snapshots (before modification)
   ↓
5. AI generates workflow changes
   ↓
6. User reviews diff
   ↓
7. User confirms → PATCH workflow via n8n API
   ↓
8. If needed to undo → Restore from snapshot
```

## Security Layers

### Layer 1: Row Level Security (RLS)
All queries automatically filtered by `auth.uid() = user_id`

### Layer 2: Check Constraints
- `messages.role` must be 'user', 'assistant', or 'system'
- `messages.user_id` must match conversation owner
- `workflow_snapshots.workflow_json` max 1MB

### Layer 3: Restricted Updates
Users CANNOT update:
- `profiles.is_lifetime`
- `profiles.stripe_customer_id`

Only service role (Stripe webhook) can update these fields.

### Layer 4: Audit Logging
All changes to sensitive fields are logged in `profile_audit_log`.

### Layer 5: Foreign Key Cascades
Deleting a user cascades to:
- profiles
- conversations
- messages
- workflow_snapshots
- profile_audit_log

This ensures no orphaned data.

## Performance Characteristics

### Indexes
| Index | Purpose | Query Impact |
|-------|---------|--------------|
| `idx_conversations_user_created` | List recent conversations | O(log n) → O(1) for top 20 |
| `idx_messages_conversation` | Load chat history | O(log n) → O(m) where m = message count |
| `idx_messages_created_at` | 7-day filtering | O(log n) → O(k) where k = recent messages |
| `idx_snapshots_user_workflow` | Find latest snapshot | O(log n) → O(1) for latest |
| `idx_audit_log_profile` | Audit trail lookup | O(log n) → O(j) where j = audit entries |

### Expected Query Times (at scale)
- Fetch profile: <5ms
- List conversations: <10ms (for 100+ conversations)
- Load messages: <20ms (for 1000+ messages)
- Find snapshot: <5ms
- 7-day filter: <50ms (with index)

## Storage Estimates

Assuming 10,000 active users:

| Table | Avg Size/Row | Rows | Total Size |
|-------|-------------|------|------------|
| profiles | 0.5 KB | 10,000 | 5 MB |
| conversations | 0.3 KB | 50,000 | 15 MB |
| messages | 1 KB | 500,000 | 500 MB |
| workflow_snapshots | 50 KB | 20,000 | 1 GB |
| profile_audit_log | 0.5 KB | 5,000 | 2.5 MB |

**Total**: ~1.5 GB (well within free tier limits)

## Supabase Free Tier Limits

- Database size: 500 MB → ⚠️ Will exceed at ~5,000 active users
- Bandwidth: 5 GB/month → Should be fine
- API requests: Unlimited (rate limited)

**Recommendation**: Upgrade to Pro tier ($25/month) at ~3,000 users for:
- 8 GB database
- 50 GB bandwidth
- Daily backups

## Scaling Considerations

### When to Partition
Consider partitioning `messages` table when:
- Total messages > 10 million
- Query times > 100ms
- Partition by `created_at` (monthly)

### When to Archive
Consider archiving old data when:
- Database > 5 GB
- Archive messages older than 30 days to separate storage
- Keep recent_messages view for active data

### When to Add Caching
- Redis/Memcached for profile data (reduce DB load)
- Cache recent conversations client-side
- Use Supabase Realtime for live updates

## Monitoring Recommendations

Watch these metrics:
1. **Database Size**: Track growth rate
2. **Query Performance**: Slow query log (>100ms)
3. **RLS Denials**: Failed permission checks (potential attack)
4. **Audit Log Anomalies**: Unexpected profile changes
5. **API Error Rate**: >1% indicates issues

## Backup Strategy

1. **Automatic**: Supabase daily backups (Pro tier)
2. **Manual**: Weekly export via `pg_dump`
3. **Point-in-Time Recovery**: Available on Pro tier
4. **Critical Tables**: Extra backups of profiles and audit_log

---

**Legend**:
- PK = Primary Key
- FK = Foreign Key
- ⚠️ = Protected field (cannot be updated by users)
- CASCADE DELETE = Deleting parent deletes children
