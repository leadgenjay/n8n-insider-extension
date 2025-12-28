-- Migration: Create recent_messages view
-- Description: Filtered view showing only messages from the last 7 days
-- Dependencies: Requires messages table

-- Create view for 7-day message retention
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

-- Comments for documentation
comment on view public.recent_messages is 'Messages from the last 7 days only (query-time filtering)';

-- Note: This view inherits RLS policies from the messages table
-- Users will only see their own messages even in this view
