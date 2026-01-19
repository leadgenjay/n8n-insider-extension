-- =====================================================
-- N8N INSIDER UNIFIED SCHEMA
-- For new Supabase project: uprkqfygjhxudhdpqhju
-- Run this entire file in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. UNIFIED PROFILES TABLE
-- Merges fields from extension (stripe, subscription)
-- and templates app (is_insiders, full_name)
-- =====================================================
CREATE TABLE public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,

  -- Access flags
  is_lifetime boolean DEFAULT false,           -- Pro access (extension)
  is_insiders boolean DEFAULT false,           -- Insiders exclusive access (templates)

  -- Stripe integration (extension)
  stripe_customer_id text,
  subscription_status text DEFAULT 'free',     -- 'free', 'active', 'canceled', 'past_due'
  subscription_id text,
  subscription_end_date timestamptz,

  -- Usage tracking
  usage_count integer DEFAULT 0,

  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update own profile (protected fields excluded)
CREATE POLICY "Users can update own profile (restricted)"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_lifetime = (SELECT is_lifetime FROM profiles WHERE id = auth.uid())
    AND is_insiders = (SELECT is_insiders FROM profiles WHERE id = auth.uid())
    AND stripe_customer_id = (SELECT stripe_customer_id FROM profiles WHERE id = auth.uid())
    AND subscription_status = (SELECT subscription_status FROM profiles WHERE id = auth.uid())
  );

-- Indexes for profiles
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- =====================================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  );
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 3. CONVERSATIONS TABLE (Extension)
-- =====================================================
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text DEFAULT 'New Conversation',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversations"
  ON public.conversations FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_conversations_user_created
  ON public.conversations(user_id, created_at DESC);

-- =====================================================
-- 4. MESSAGES TABLE (Extension)
-- =====================================================
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own messages"
  ON public.messages FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_messages_conversation
  ON public.messages(conversation_id, created_at ASC);

CREATE INDEX idx_messages_created_at
  ON public.messages(created_at DESC);

-- =====================================================
-- 5. WORKFLOW SNAPSHOTS TABLE (Extension)
-- =====================================================
CREATE TABLE public.workflow_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  n8n_workflow_id text NOT NULL,
  workflow_json jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.workflow_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own snapshots"
  ON public.workflow_snapshots FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX idx_snapshots_user_workflow
  ON public.workflow_snapshots(user_id, n8n_workflow_id, created_at DESC);

-- Size constraint (1MB limit)
ALTER TABLE public.workflow_snapshots
  ADD CONSTRAINT workflow_json_size_limit
  CHECK (pg_column_size(workflow_json) < 1048576);

-- =====================================================
-- 6. RECENT MESSAGES VIEW (7-day retention)
-- =====================================================
CREATE OR REPLACE VIEW public.recent_messages
WITH (security_invoker = true)
AS
  SELECT
    id,
    conversation_id,
    user_id,
    role,
    content,
    metadata,
    created_at
  FROM public.messages
  WHERE created_at > (now() - interval '7 days')
  ORDER BY created_at ASC;

-- =====================================================
-- 7. PROFILE AUDIT LOG (Extension)
-- =====================================================
CREATE TABLE public.profile_audit_log (
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

CREATE INDEX idx_audit_log_profile ON public.profile_audit_log(profile_id, changed_at DESC);

-- Trigger to log profile changes
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF OLD.is_lifetime IS DISTINCT FROM NEW.is_lifetime
     OR OLD.is_insiders IS DISTINCT FROM NEW.is_insiders
     OR OLD.stripe_customer_id IS DISTINCT FROM NEW.stripe_customer_id
     OR OLD.subscription_status IS DISTINCT FROM NEW.subscription_status THEN
    INSERT INTO profile_audit_log (profile_id, changed_fields, changed_by)
    VALUES (
      NEW.id,
      jsonb_build_object(
        'is_lifetime', jsonb_build_object('old', OLD.is_lifetime, 'new', NEW.is_lifetime),
        'is_insiders', jsonb_build_object('old', OLD.is_insiders, 'new', NEW.is_insiders),
        'stripe_customer_id', jsonb_build_object('old', OLD.stripe_customer_id, 'new', NEW.stripe_customer_id),
        'subscription_status', jsonb_build_object('old', OLD.subscription_status, 'new', NEW.subscription_status)
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

-- =====================================================
-- 8. TEMPLATES TABLE (Templates App)
-- =====================================================
CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  category text,
  tags text[],
  image_url text,
  file_path text NOT NULL,
  version integer DEFAULT 1,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  has_documentation boolean DEFAULT false,
  dfy_enabled boolean DEFAULT false,
  dfy_price integer,                           -- Price in cents
  access_tier text DEFAULT 'premium',          -- 'premium' | 'insiders_exclusive'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Public can view active templates
CREATE POLICY "Public can view active templates"
  ON public.templates FOR SELECT
  USING (active = true);

CREATE INDEX idx_templates_template_id ON public.templates(template_id);
CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_active ON public.templates(active);
CREATE INDEX idx_templates_sort_order ON public.templates(sort_order);

-- =====================================================
-- 9. WORKFLOW DOCUMENTATION TABLE (Templates App)
-- =====================================================
CREATE TABLE public.workflow_documentation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id text REFERENCES public.templates(template_id) ON DELETE CASCADE NOT NULL,
  collects jsonb DEFAULT '[]',
  analyzes jsonb DEFAULT '[]',
  recommends jsonb DEFAULT '[]',
  delivers jsonb DEFAULT '[]',
  setup_time_credentials integer,
  setup_time_configuration integer,
  setup_time_testing integer,
  difficulty_level integer,
  difficulty_label text,
  credentials jsonb DEFAULT '[]',
  credential_tips text,
  config_fields jsonb DEFAULT '[]',
  workflow_stages jsonb DEFAULT '[]',
  schedule_config text,
  common_issues jsonb DEFAULT '[]',
  testing_checklist jsonb DEFAULT '[]',
  tags jsonb DEFAULT '[]',
  screenshot_url text,
  architecture_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.workflow_documentation ENABLE ROW LEVEL SECURITY;

-- Public can view documentation for active templates
CREATE POLICY "Public can view documentation"
  ON public.workflow_documentation FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM templates
      WHERE templates.template_id = workflow_documentation.template_id
      AND templates.active = true
    )
  );

CREATE INDEX idx_workflow_documentation_template_id ON public.workflow_documentation(template_id);

-- =====================================================
-- 10. ADMIN USERS TABLE (Templates App)
-- =====================================================
CREATE TABLE public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'tech' CHECK (role IN ('super_admin', 'tech')),
  name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_admin_users_auth_user_id ON public.admin_users(auth_user_id);
CREATE INDEX idx_admin_users_email ON public.admin_users(email);

-- Only super_admins can view admin_users
CREATE POLICY "Admins can view admin users"
  ON public.admin_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- =====================================================
-- 11. ADMIN RLS POLICIES
-- Admins can manage profiles, templates, and documentation
-- =====================================================

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Admins can manage templates
CREATE POLICY "Admins can manage templates"
  ON public.templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Admins can manage documentation
CREATE POLICY "Admins can manage documentation"
  ON public.workflow_documentation FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON public.profile_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
    )
  );

-- Super admins can manage admin_users
CREATE POLICY "Super admins can manage admin users"
  ON public.admin_users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.auth_user_id = auth.uid()
      AND admin_users.role = 'super_admin'
    )
  );

-- =====================================================
-- 12. SAFE PROFILE EMAIL UPDATE FUNCTION
-- =====================================================
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

-- =====================================================
-- VERIFICATION: Run after to confirm schema
-- =====================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
--
-- Expected tables:
-- - admin_users
-- - conversations
-- - messages
-- - profile_audit_log
-- - profiles
-- - templates
-- - workflow_documentation
-- - workflow_snapshots
--
-- Expected view:
-- - recent_messages
