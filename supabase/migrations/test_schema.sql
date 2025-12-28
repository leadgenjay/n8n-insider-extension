-- Schema Validation Tests
-- Run this after applying migrations to verify everything works correctly

-- Test 1: Verify all tables exist
SELECT 'Test 1: Tables exist' as test_name;
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'conversations', 'messages', 'workflow_snapshots')
ORDER BY table_name;

-- Test 2: Verify RLS is enabled on all tables
SELECT 'Test 2: RLS enabled' as test_name;
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'conversations', 'messages', 'workflow_snapshots');

-- Test 3: Verify all policies exist
SELECT 'Test 3: Policies exist' as test_name;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test 4: Verify indexes
SELECT 'Test 4: Indexes exist' as test_name;
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'conversations', 'messages', 'workflow_snapshots')
ORDER BY tablename, indexname;

-- Test 5: Verify trigger exists
SELECT 'Test 5: Trigger exists' as test_name;
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'on_auth_user_created';

-- Test 6: Verify view exists
SELECT 'Test 6: View exists' as test_name;
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'recent_messages';

-- Test 7: Test profile auto-creation (requires cleanup after)
-- Uncomment to run - this creates a test user
/*
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  -- Create test user
  test_user_id := gen_random_uuid();

  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at, role)
  VALUES (
    test_user_id,
    'test-schema@example.com',
    crypt('test-password', gen_salt('bf')),
    now(),
    '{"provider": "email"}'::jsonb,
    now(),
    now(),
    'authenticated'
  );

  -- Check if profile was created
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = test_user_id) THEN
    RAISE NOTICE 'Test 7 PASSED: Profile auto-created for user %', test_user_id;
  ELSE
    RAISE EXCEPTION 'Test 7 FAILED: Profile was not auto-created';
  END IF;

  -- Cleanup
  DELETE FROM auth.users WHERE id = test_user_id;

END $$;
*/

-- Test 8: Verify foreign key constraints
SELECT 'Test 8: Foreign keys' as test_name;
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('profiles', 'conversations', 'messages', 'workflow_snapshots')
ORDER BY tc.table_name, kcu.column_name;

-- Test 9: Verify check constraints
SELECT 'Test 9: Check constraints' as test_name;
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('messages')
ORDER BY tc.table_name;

-- Test 10: Verify column defaults
SELECT 'Test 10: Column defaults' as test_name;
SELECT
  table_name,
  column_name,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'conversations', 'messages', 'workflow_snapshots')
  AND column_default IS NOT NULL
ORDER BY table_name, ordinal_position;

-- Summary
SELECT 'Schema validation complete' as result;
