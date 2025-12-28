# Row Level Security (RLS) Analysis

## Overview
All tables in the n8n AI Copilot database have Row Level Security (RLS) enabled to ensure users can only access their own data. This document analyzes the security posture and potential vulnerabilities.

## Security Model

### Core Principle
**"Users can only access data they own"**

Every table has a `user_id` column that references `auth.uid()` (the currently authenticated user's ID). All policies enforce:

```sql
using (auth.uid() = user_id)
```

## Table-by-Table Analysis

### 1. profiles
**Sensitivity**: HIGH (contains payment status and personal info)

**Policies**:
- SELECT: Users can view their own profile
- UPDATE: Users can update their own profile
- INSERT: Not allowed (handled by trigger)
- DELETE: Not allowed

**Security Score**: 9/10

**Potential Issues**:
- Users can update their own `is_lifetime` field - **CRITICAL VULNERABILITY**
  - **Mitigation Required**: Add policy restriction or use a separate function

**Recommendation**:
```sql
-- Remove current update policy
DROP POLICY "Users can update own profile" ON public.profiles;

-- Create restricted update policy
CREATE POLICY "Users can update own profile (restricted)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_lifetime = (SELECT is_lifetime FROM profiles WHERE id = auth.uid())
    AND stripe_customer_id = (SELECT stripe_customer_id FROM profiles WHERE id = auth.uid())
  );

-- OR: Use a function for safe updates
CREATE OR REPLACE FUNCTION update_profile(new_email text)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET email = new_email, updated_at = now()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2. conversations
**Sensitivity**: MEDIUM (conversation titles could contain sensitive info)

**Policies**:
- ALL: Users can manage their own conversations

**Security Score**: 10/10

**Potential Issues**: None identified

**Notes**:
- Policy correctly restricts all operations to owner
- CASCADE delete ensures cleanup when user is deleted

### 3. messages
**Sensitivity**: HIGH (contains chat history and potentially sensitive workflow data)

**Policies**:
- ALL: Users can manage their own messages

**Security Score**: 10/10

**Potential Issues**: None identified

**Notes**:
- Metadata field could contain screenshots or sensitive data
- Consider encryption at rest for high-security deployments
- 7-day retention is enforced at query time, not storage (intentional design)

**7-Day Retention Analysis**:
- Current: Query-time filtering via view
- Pro: Simple, no scheduled jobs
- Con: Data not actually deleted, consumes storage
- **Recommendation for Production**: Add scheduled deletion job

```sql
-- Edge Function or pg_cron job
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'delete-old-messages',
  '0 0 * * *', -- Daily at midnight
  $$DELETE FROM public.messages WHERE created_at < now() - interval '7 days'$$
);
```

### 4. workflow_snapshots
**Sensitivity**: HIGH (contains complete workflow JSON with potential credentials)

**Policies**:
- ALL: Users can manage their own snapshots

**Security Score**: 8/10

**Potential Issues**:
- Workflow JSON might contain hardcoded credentials or API keys
- Large JSONB fields could cause performance issues
- No size limit on workflow_json field

**Recommendations**:
1. **Scan for secrets**: Add a policy or function to detect credentials
2. **Size limit**: Add constraint to prevent abuse

```sql
-- Add size constraint
ALTER TABLE workflow_snapshots
ADD CONSTRAINT workflow_json_size_limit
CHECK (pg_column_size(workflow_json) < 1048576); -- 1MB limit

-- Consider encryption for workflow_json
-- Using pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

## Cross-Table Attack Vectors

### Attack 1: Conversation ID Guessing
**Scenario**: User tries to access another user's messages by guessing conversation_id

**Mitigation**: RLS policy checks `user_id`, not just `conversation_id`

**Test**:
```sql
-- As user A (should fail)
SELECT * FROM messages WHERE conversation_id = '<user-b-conversation-id>';
-- Result: 0 rows (RLS blocks it)
```

**Status**: PROTECTED

### Attack 2: Profile Tampering
**Scenario**: User tries to set `is_lifetime = true` via update

**Mitigation**: CURRENTLY VULNERABLE - see profile section above

**Test**:
```sql
-- As free user (currently succeeds - BAD!)
UPDATE profiles SET is_lifetime = true WHERE id = auth.uid();
```

**Status**: VULNERABLE - FIX REQUIRED

### Attack 3: Message Injection
**Scenario**: User tries to insert messages into another user's conversation

**Mitigation**: Even if user knows conversation_id, INSERT requires matching user_id

**Test**:
```sql
-- As user A trying to inject into user B's conversation
INSERT INTO messages (conversation_id, user_id, role, content)
VALUES ('<user-b-conversation>', auth.uid(), 'assistant', 'Fake response');
-- Result: Succeeds but message belongs to user A, not B
-- User B can't see it because of RLS
```

**Status**: PARTIALLY PROTECTED
- User can't inject into another user's view
- But could create orphaned messages (conversation owned by B, message owned by A)

**Recommendation**: Add foreign key constraint check:
```sql
-- Add constraint to ensure user owns the conversation
ALTER TABLE messages
ADD CONSTRAINT messages_user_owns_conversation
CHECK (
  user_id = (SELECT user_id FROM conversations WHERE id = conversation_id)
);
```

## Service Role Bypass

### Stripe Webhook Function
The Stripe webhook Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS.

**Security Measures**:
1. Verify webhook signature before any DB operations
2. Only update specific fields (is_lifetime, stripe_customer_id)
3. Never trust client-provided user_id - use Stripe session metadata

**Safe Pattern**:
```typescript
// Edge Function: supabase/functions/stripe-webhook/index.ts
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

if (event.type === 'checkout.session.completed') {
  const session = event.data.object;

  // IMPORTANT: user_id comes from session.client_reference_id
  // which we control (set during checkout creation)
  const userId = session.client_reference_id;

  // Use service role to bypass RLS (webhook not a user)
  await supabase
    .from('profiles')
    .update({
      is_lifetime: true,
      stripe_customer_id: session.customer
    })
    .eq('id', userId);
}
```

## Security Checklist

- [x] RLS enabled on all tables
- [x] Policies enforce user ownership
- [x] Foreign keys use CASCADE delete
- [ ] **Fix profile update policy to prevent tampering**
- [ ] Add message-conversation ownership constraint
- [ ] Implement scheduled deletion for 7-day retention
- [ ] Add size limits on JSONB fields
- [ ] Scan workflow snapshots for secrets
- [ ] Set up monitoring for unusual access patterns

## Testing RLS Policies

### Manual Test Script
```sql
-- Create two test users
INSERT INTO auth.users (id, email) VALUES
  ('user-a-uuid', 'user-a@test.com'),
  ('user-b-uuid', 'user-b@test.com');

-- Set session to user A
SELECT set_config('request.jwt.claims', '{"sub": "user-a-uuid"}', true);

-- Try to read user B's data (should return 0 rows)
SELECT * FROM profiles WHERE id = 'user-b-uuid';
SELECT * FROM conversations WHERE user_id = 'user-b-uuid';
SELECT * FROM messages WHERE user_id = 'user-b-uuid';

-- Verify can read own data
SELECT * FROM profiles WHERE id = 'user-a-uuid';
```

### Automated Testing
Consider using [supabase-test-helpers](https://github.com/supabase-community/supabase-test-helpers) or custom test framework.

## Monitoring & Alerts

### Recommended Monitoring
1. **Failed RLS Policy Violations**: Track denied queries
2. **Unusual Update Patterns**: Alert if user updates `is_lifetime` without Stripe event
3. **Large Queries**: Alert on queries returning >1000 rows (potential scraping)
4. **API Rate Limiting**: Track usage_count increases

### Implementation
```sql
-- Example: Audit log for profile updates
CREATE TABLE IF NOT EXISTS profile_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  changed_fields jsonb,
  changed_by uuid,
  changed_at timestamptz DEFAULT now()
);

-- Trigger to log changes
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profile_audit_log (user_id, changed_fields, changed_by)
  VALUES (
    NEW.id,
    jsonb_build_object(
      'is_lifetime', jsonb_build_object('old', OLD.is_lifetime, 'new', NEW.is_lifetime),
      'stripe_customer_id', jsonb_build_object('old', OLD.stripe_customer_id, 'new', NEW.stripe_customer_id)
    ),
    auth.uid()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profile_changes_audit
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_changes();
```

## Conclusion

**Overall Security Score**: 8.5/10

**Critical Actions Required**:
1. Fix profile update policy to prevent `is_lifetime` tampering
2. Add message-conversation ownership constraint
3. Implement audit logging for sensitive changes

**Nice-to-Have Improvements**:
1. Scheduled deletion for 7-day message retention
2. Size limits on JSONB fields
3. Secret scanning in workflow snapshots
4. Encryption at rest for sensitive fields

**Next Steps**:
1. Apply the recommended policy fixes
2. Set up monitoring and alerts
3. Perform penetration testing with different user contexts
4. Document security procedures for team
