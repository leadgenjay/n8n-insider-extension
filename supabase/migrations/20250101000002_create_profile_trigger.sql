-- Migration: Auto-create profile on user signup
-- Description: Trigger function that creates a profile record when a new user signs up
-- Dependencies: Requires profiles table

-- Create trigger function
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

-- Create trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Comments for documentation
comment on function public.handle_new_user is 'Automatically creates a profile when a new user signs up';
