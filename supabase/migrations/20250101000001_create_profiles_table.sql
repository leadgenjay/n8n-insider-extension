-- Migration: Create profiles table
-- Description: Extends auth.users with application-specific profile data
-- Dependencies: Requires auth.users table (built-in Supabase)

-- Create profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  is_lifetime boolean default false,
  stripe_customer_id text,
  usage_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- RLS Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Comments for documentation
comment on table public.profiles is 'User profiles extending auth.users with app-specific data';
comment on column public.profiles.id is 'References auth.users.id';
comment on column public.profiles.email is 'User email (duplicated for convenience)';
comment on column public.profiles.is_lifetime is 'Whether user has purchased lifetime Pro access';
comment on column public.profiles.stripe_customer_id is 'Stripe customer ID for payment tracking';
comment on column public.profiles.usage_count is 'Track API usage (for future rate limiting)';
