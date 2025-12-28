-- =====================================================
-- N8N AI COPILOT - COMPLETE DATABASE SCHEMA
-- Copy this entire file into Supabase SQL Editor and run once
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- =====================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  is_lifetime boolean default false,
  stripe_customer_id text,
  usage_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- =====================================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- =====================================================
-- 3. CONVERSATIONS TABLE
-- =====================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text default 'New Conversation',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.conversations enable row level security;

create policy "Users can manage own conversations"
  on public.conversations for all
  using (auth.uid() = user_id);

create index idx_conversations_user_created
  on public.conversations(user_id, created_at desc);

-- =====================================================
-- 4. MESSAGES TABLE
-- =====================================================
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users can manage own messages"
  on public.messages for all
  using (auth.uid() = user_id);

create index idx_messages_conversation
  on public.messages(conversation_id, created_at asc);

create index idx_messages_created_at
  on public.messages(created_at desc);

-- =====================================================
-- 5. WORKFLOW SNAPSHOTS TABLE
-- =====================================================
create table public.workflow_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  n8n_workflow_id text not null,
  workflow_json jsonb not null,
  created_at timestamptz default now()
);

alter table public.workflow_snapshots enable row level security;

create policy "Users can manage own snapshots"
  on public.workflow_snapshots for all
  using (auth.uid() = user_id);

create index idx_snapshots_user_workflow
  on public.workflow_snapshots(user_id, n8n_workflow_id, created_at desc);

-- =====================================================
-- 6. RECENT MESSAGES VIEW (7-day retention)
-- =====================================================
create or replace view public.recent_messages
with (security_invoker = true)
as
  select
    id,
    conversation_id,
    user_id,
    role,
    content,
    metadata,
    created_at
  from public.messages
  where created_at > (now() - interval '7 days')
  order by created_at asc;

-- =====================================================
-- 7. SECURITY FIXES
-- =====================================================

-- Fix profile update policy to prevent payment tampering
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile (restricted)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_lifetime = (SELECT is_lifetime FROM profiles WHERE id = auth.uid())
    AND stripe_customer_id = (SELECT stripe_customer_id FROM profiles WHERE id = auth.uid())
  );

-- Ensure messages belong to conversations owned by the same user
ALTER TABLE public.messages
  ADD CONSTRAINT messages_user_owns_conversation
  CHECK (
    user_id = (SELECT user_id FROM conversations WHERE id = conversation_id)
  );

-- Add size limit to workflow_json (1MB)
ALTER TABLE public.workflow_snapshots
  ADD CONSTRAINT workflow_json_size_limit
  CHECK (pg_column_size(workflow_json) < 1048576);

-- Safe function for updating profile email
CREATE OR REPLACE FUNCTION update_profile_email(new_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Audit log for profile changes
CREATE TABLE IF NOT EXISTS public.profile_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  changed_fields jsonb NOT NULL,
  changed_by uuid,
  changed_at timestamptz DEFAULT now()
);

ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit log"
  ON public.profile_audit_log FOR SELECT
  USING (changed_by = auth.uid() OR profile_id = auth.uid());

-- Trigger to log profile changes
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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

CREATE INDEX idx_audit_log_profile ON public.profile_audit_log(profile_id, changed_at DESC);

-- =====================================================
-- VERIFICATION: Run this after to confirm schema
-- =====================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
--
-- Expected tables:
-- - conversations
-- - messages
-- - profile_audit_log
-- - profiles
-- - workflow_snapshots
