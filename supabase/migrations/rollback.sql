-- Rollback Script: Remove all n8n AI Copilot schema
-- WARNING: This will DELETE ALL DATA in these tables
-- Use with extreme caution - only in development/staging environments

-- Drop view first (depends on messages table)
drop view if exists public.recent_messages;

-- Drop tables in reverse dependency order
drop table if exists public.workflow_snapshots;
drop table if exists public.messages;
drop table if exists public.conversations;

-- Drop trigger before dropping the function
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Drop profiles table last
drop table if exists public.profiles;

-- Verification query
-- Run this to confirm all objects are removed
/*
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'conversations', 'messages', 'workflow_snapshots');
*/
