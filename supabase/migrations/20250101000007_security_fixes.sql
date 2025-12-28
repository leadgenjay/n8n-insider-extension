-- Migration: Security Fixes for RLS Policies
-- Description: Fixes critical vulnerability in profile updates and adds constraints
-- Dependencies: Requires all previous migrations

-- Fix 1: Restrict profile updates to prevent tampering with is_lifetime and stripe_customer_id
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile (restricted)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent users from changing their payment status
    AND is_lifetime = (SELECT is_lifetime FROM profiles WHERE id = auth.uid())
    AND stripe_customer_id = (SELECT stripe_customer_id FROM profiles WHERE id = auth.uid())
    -- Allow updating email and usage_count
  );

-- Fix 2: Ensure messages belong to conversations owned by the same user
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_user_owns_conversation;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_user_owns_conversation
  CHECK (
    user_id = (SELECT user_id FROM conversations WHERE id = conversation_id)
  );

-- Fix 3: Add size limit to workflow_json to prevent abuse
ALTER TABLE public.workflow_snapshots
  DROP CONSTRAINT IF EXISTS workflow_json_size_limit;

ALTER TABLE public.workflow_snapshots
  ADD CONSTRAINT workflow_json_size_limit
  CHECK (pg_column_size(workflow_json) < 1048576); -- 1MB limit

-- Fix 4: Create safe function for updating profile email
CREATE OR REPLACE FUNCTION update_profile_email(new_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate email format
  IF new_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;

  UPDATE profiles
  SET
    email = new_email,
    updated_at = now()
  WHERE id = auth.uid();
END;
$$;

COMMENT ON FUNCTION update_profile_email IS 'Safely update user email without exposing payment fields';

-- Fix 5: Create audit log for profile changes
CREATE TABLE IF NOT EXISTS public.profile_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  changed_fields jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can only see their own audit logs
CREATE POLICY "Users can view own audit log"
  ON public.profile_audit_log FOR SELECT
  USING (changed_by = auth.uid() OR profile_id = auth.uid());

-- Create trigger to log profile changes
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if sensitive fields changed
  IF OLD.is_lifetime != NEW.is_lifetime OR OLD.stripe_customer_id != NEW.stripe_customer_id THEN
    INSERT INTO profile_audit_log (profile_id, changed_fields, changed_by)
    VALUES (
      NEW.id,
      jsonb_build_object(
        'is_lifetime', jsonb_build_object('old', OLD.is_lifetime, 'new', NEW.is_lifetime),
        'stripe_customer_id', jsonb_build_object('old', OLD.stripe_customer_id, 'new', NEW.stripe_customer_id)
      ),
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profile_changes_audit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_changes();

COMMENT ON TABLE public.profile_audit_log IS 'Audit trail for sensitive profile changes';
COMMENT ON FUNCTION log_profile_changes IS 'Trigger to log changes to is_lifetime and stripe_customer_id';

-- Fix 6: Add index for audit log queries
CREATE INDEX idx_audit_log_profile ON public.profile_audit_log(profile_id, changed_at DESC);

-- Verification queries
-- Run these to verify the fixes work correctly
/*
-- Test 1: Try to update is_lifetime (should fail)
UPDATE profiles SET is_lifetime = true WHERE id = auth.uid();

-- Test 2: Try to insert message into another user's conversation (should fail constraint)
INSERT INTO messages (conversation_id, user_id, role, content)
VALUES ('<other-user-conversation-id>', auth.uid(), 'user', 'test');

-- Test 3: Use safe function to update email (should succeed)
SELECT update_profile_email('newemail@example.com');

-- Test 4: Check audit log
SELECT * FROM profile_audit_log WHERE profile_id = auth.uid();
*/
