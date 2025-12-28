-- Migration: Create workflow_snapshots table
-- Description: Stores original workflow state before AI-driven modifications
-- Dependencies: Requires profiles table

-- Create workflow_snapshots table
create table public.workflow_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  n8n_workflow_id text not null,
  workflow_json jsonb not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.workflow_snapshots enable row level security;

-- RLS Policy: Users can only access their own snapshots
create policy "Users can manage own snapshots"
  on public.workflow_snapshots for all
  using (auth.uid() = user_id);

-- Performance index for finding snapshots by workflow ID
create index idx_snapshots_user_workflow
  on public.workflow_snapshots(user_id, n8n_workflow_id, created_at desc);

-- Comments for documentation
comment on table public.workflow_snapshots is 'Backup snapshots of n8n workflows before AI modifications';
comment on column public.workflow_snapshots.n8n_workflow_id is 'The n8n workflow ID (not UUID, could be string/number)';
comment on column public.workflow_snapshots.workflow_json is 'Complete workflow JSON for restoration';
comment on index idx_snapshots_user_workflow is 'Optimize finding latest snapshot for a specific workflow';
