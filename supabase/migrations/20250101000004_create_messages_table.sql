-- Migration: Create messages table
-- Description: Individual chat messages with role-based content
-- Dependencies: Requires conversations and profiles tables

-- Create messages table
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.messages enable row level security;

-- RLS Policy: Users can only access their own messages
create policy "Users can manage own messages"
  on public.messages for all
  using (auth.uid() = user_id);

-- Performance index for fetching conversation messages in chronological order
create index idx_messages_conversation
  on public.messages(conversation_id, created_at asc);

-- Optional: Index for filtering by created_at for 7-day retention queries
create index idx_messages_created_at
  on public.messages(created_at desc);

-- Comments for documentation
comment on table public.messages is 'Individual chat messages within conversations';
comment on column public.messages.role is 'Message sender: user, assistant, or system';
comment on column public.messages.content is 'Message text content';
comment on column public.messages.metadata is 'Additional data (e.g., model used, screenshot URL, tokens)';
comment on index idx_messages_conversation is 'Optimize fetching messages in a conversation chronologically';
comment on index idx_messages_created_at is 'Optimize filtering messages by date (7-day retention)';
