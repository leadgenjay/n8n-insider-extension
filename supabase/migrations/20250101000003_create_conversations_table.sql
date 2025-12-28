-- Migration: Create conversations table
-- Description: Groups chat messages into conversation sessions
-- Dependencies: Requires profiles table

-- Create conversations table
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text default 'New Conversation',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.conversations enable row level security;

-- RLS Policy: Users can only access their own conversations
create policy "Users can manage own conversations"
  on public.conversations for all
  using (auth.uid() = user_id);

-- Performance index for listing user's conversations
create index idx_conversations_user_created
  on public.conversations(user_id, created_at desc);

-- Comments for documentation
comment on table public.conversations is 'Chat conversation sessions grouping related messages';
comment on column public.conversations.user_id is 'Owner of the conversation';
comment on column public.conversations.title is 'Conversation title (auto-generated or user-defined)';
comment on index idx_conversations_user_created is 'Optimize fetching user conversations ordered by recency';
