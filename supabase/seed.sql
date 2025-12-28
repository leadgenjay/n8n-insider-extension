-- Seed Data for Development/Testing
-- This file contains sample data for local development and testing

-- Note: This assumes you have a test user created via Supabase Auth
-- Replace the UUIDs below with your actual test user IDs

-- Example test user ID (replace with your actual user ID)
-- You can get this by signing up in your local Supabase instance
DO $$
DECLARE
  test_user_id uuid := '00000000-0000-0000-0000-000000000001'; -- Replace with real user ID
BEGIN
  -- Check if test user exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = test_user_id) THEN
    RAISE NOTICE 'Test user does not exist. Create a user first via Supabase Auth.';
    RETURN;
  END IF;

  -- Seed profile data (if not already created by trigger)
  INSERT INTO public.profiles (id, email, is_lifetime, usage_count)
  VALUES (test_user_id, 'test@example.com', false, 0)
  ON CONFLICT (id) DO UPDATE
  SET
    is_lifetime = EXCLUDED.is_lifetime,
    usage_count = EXCLUDED.usage_count;

  -- Seed conversations
  INSERT INTO public.conversations (id, user_id, title, created_at)
  VALUES
    (gen_random_uuid(), test_user_id, 'Debugging webhook workflow', now() - interval '2 days'),
    (gen_random_uuid(), test_user_id, 'Optimizing Slack notification', now() - interval '1 day'),
    (gen_random_uuid(), test_user_id, 'New Conversation', now())
  ON CONFLICT (id) DO NOTHING;

  -- Get conversation IDs for messages
  WITH conv AS (
    SELECT id FROM public.conversations WHERE user_id = test_user_id ORDER BY created_at LIMIT 1
  )
  -- Seed messages in first conversation
  INSERT INTO public.messages (conversation_id, user_id, role, content, created_at)
  SELECT
    conv.id,
    test_user_id,
    'user',
    'Why is my webhook node failing with a 401 error?',
    now() - interval '2 days'
  FROM conv
  UNION ALL
  SELECT
    conv.id,
    test_user_id,
    'assistant',
    'A 401 error typically indicates an authentication issue. Let me help you debug this:\n\n1. Check if your API key is correctly configured in the webhook credentials\n2. Verify the Authorization header format\n3. Ensure the API key has not expired\n\nCan you share a screenshot of your webhook node configuration?',
    now() - interval '2 days' + interval '30 seconds'
  FROM conv
  UNION ALL
  SELECT
    conv.id,
    test_user_id,
    'user',
    'Here is the screenshot [attached]',
    now() - interval '2 days' + interval '1 minute'
  FROM conv;

  -- Seed workflow snapshot
  INSERT INTO public.workflow_snapshots (user_id, n8n_workflow_id, workflow_json)
  VALUES (
    test_user_id,
    'workflow_12345',
    '{
      "name": "Webhook Test Workflow",
      "nodes": [
        {
          "id": "node-1",
          "type": "n8n-nodes-base.webhook",
          "name": "Webhook",
          "parameters": {
            "path": "test-webhook",
            "responseMode": "responseNode"
          }
        },
        {
          "id": "node-2",
          "type": "n8n-nodes-base.respondToWebhook",
          "name": "Respond to Webhook",
          "parameters": {
            "respondWith": "json",
            "responseBody": "{ \"success\": true }"
          }
        }
      ],
      "connections": {
        "Webhook": {
          "main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]
        }
      }
    }'::jsonb
  );

  RAISE NOTICE 'Seed data inserted successfully for user %', test_user_id;
END $$;

-- Verify seed data
SELECT 'Profiles:' as table_name, count(*) as record_count FROM public.profiles
UNION ALL
SELECT 'Conversations:', count(*) FROM public.conversations
UNION ALL
SELECT 'Messages:', count(*) FROM public.messages
UNION ALL
SELECT 'Workflow Snapshots:', count(*) FROM public.workflow_snapshots;
