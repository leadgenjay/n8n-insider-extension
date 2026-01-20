-- Profile Migration: Create lookup table and trigger for restoring user data
-- Run this in NEW Supabase SQL Editor: https://supabase.com/dashboard/project/uprkqfygjhxudhdpqhju/sql/new

-- Step 1: Create the migration lookup table
CREATE TABLE IF NOT EXISTS profile_migration_lookup (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  old_user_id UUID,
  is_lifetime BOOLEAN DEFAULT FALSE,
  is_insiders BOOLEAN DEFAULT FALSE,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'free',
  subscription_id TEXT,
  subscription_end_date TIMESTAMPTZ,
  credits_balance INTEGER DEFAULT 100,
  usage_count INTEGER DEFAULT 0,
  migrated_at TIMESTAMPTZ DEFAULT NOW(),
  restored_at TIMESTAMPTZ,
  restored_to_user_id UUID
);

-- Step 2: Create function to restore profile data on signup
CREATE OR REPLACE FUNCTION restore_migrated_profile()
RETURNS TRIGGER AS $$
DECLARE
  lookup_record RECORD;
BEGIN
  -- Find matching record by email
  SELECT * INTO lookup_record
  FROM profile_migration_lookup
  WHERE LOWER(email) = LOWER(NEW.email)
  AND restored_at IS NULL
  LIMIT 1;

  -- If found, update the new profile with old data
  IF FOUND THEN
    NEW.is_lifetime := lookup_record.is_lifetime;
    NEW.is_insiders := lookup_record.is_insiders;
    NEW.stripe_customer_id := lookup_record.stripe_customer_id;
    NEW.subscription_status := lookup_record.subscription_status;
    NEW.subscription_id := lookup_record.subscription_id;
    NEW.subscription_end_date := lookup_record.subscription_end_date;
    NEW.credits_balance := lookup_record.credits_balance;
    NEW.usage_count := lookup_record.usage_count;

    -- Mark as restored
    UPDATE profile_migration_lookup
    SET restored_at = NOW(),
        restored_to_user_id = NEW.id
    WHERE id = lookup_record.id;

    RAISE NOTICE 'Restored profile data for %', NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create trigger on profiles table (BEFORE INSERT)
DROP TRIGGER IF EXISTS restore_migrated_profile_trigger ON profiles;
CREATE TRIGGER restore_migrated_profile_trigger
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION restore_migrated_profile();

-- Step 4: Grant necessary permissions
ALTER TABLE profile_migration_lookup ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to migration lookup"
  ON profile_migration_lookup
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
