-- Migration: Add subscription fields to profiles
-- Description: Adds subscription_status, subscription_id, and subscription_end_date for Stripe subscriptions

-- Add subscription columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.subscription_status IS 'Subscription status: free, active, canceled, past_due';
COMMENT ON COLUMN public.profiles.subscription_id IS 'Stripe subscription ID';
COMMENT ON COLUMN public.profiles.subscription_end_date IS 'When current billing period ends (for grace period on cancellation)';

-- Create index for subscription_id lookups (used by webhooks)
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_id ON public.profiles(subscription_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
