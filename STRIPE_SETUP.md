# Stripe Payment Setup Guide

## Overview
This guide walks you through setting up Stripe for the n8n AI Copilot Pro tier (lifetime access).

---

## Step 1: Create Stripe Account

1. Go to https://dashboard.stripe.com
2. Create an account if you don't have one
3. Complete account verification

---

## Step 2: Create Product & Payment Link

### Create the Product
1. Go to **Products** → **Add product**
2. Fill in:
   - **Name:** n8n AI Copilot Pro - Lifetime
   - **Description:** Lifetime access to n8n AI Copilot Pro features
   - **Pricing:** One-time (not recurring)
   - **Price:** Your chosen price (e.g., $29)
3. Save the product

### Create Payment Link
1. Go to **Payment Links** → **Create payment link**
2. Select your product
3. Under **After payment**:
   - Set redirect to your success page (or leave default)
4. Click **Create link**
5. **Copy the payment link URL** (e.g., `https://buy.stripe.com/abc123xyz`)

---

## Step 3: Configure Webhook

### Add Webhook Endpoint
1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set URL to: `https://yndcawdtkpqulpzxkwif.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen:
   - `checkout.session.completed`
   - `charge.refunded`
5. Click **Add endpoint**

### Get Webhook Secret
1. Click on your new webhook endpoint
2. Under **Signing secret**, click **Reveal**
3. Copy the secret (starts with `whsec_`)

---

## Step 4: Get API Keys

1. Go to **Developers** → **API keys**
2. Copy your **Secret key** (starts with `sk_live_` or `sk_test_`)

> **Note:** Use test keys (`sk_test_`) for development, live keys (`sk_live_`) for production.

---

## Step 5: Deploy Edge Function

Run these commands in your terminal:

```bash
# Set the Stripe secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key_here
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Deploy the function
supabase functions deploy stripe-webhook
```

If you don't have Supabase CLI installed:
```bash
npm install -g supabase
supabase login
supabase link --project-ref yndcawdtkpqulpzxkwif
```

---

## Step 6: Update Extension Code

Update the payment link in `src/components/settings/SettingsPanel.tsx`:

```tsx
// Line 82: Replace the placeholder URL
href="https://buy.stripe.com/YOUR_PAYMENT_LINK?client_reference_id=${profile?.id}"
```

**Important:** The `client_reference_id` parameter is required! It passes the user ID to Stripe so the webhook knows which user to upgrade.

---

## Testing the Flow

### Test Mode
1. Use test API keys (sk_test_...)
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date and any CVC

### Verify Integration
1. Make a test purchase
2. Check Supabase logs: **Edge Functions** → **stripe-webhook** → **Logs**
3. Verify user's `is_lifetime` is set to `true` in profiles table

---

## Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set `is_lifetime = true`, store `stripe_customer_id` |
| `charge.refunded` | Set `is_lifetime = false` (downgrade) |

---

## Troubleshooting

### Webhook not receiving events?
- Check webhook endpoint URL is correct
- Verify webhook is **enabled** in Stripe dashboard
- Check Supabase Edge Function logs for errors

### User not upgraded after payment?
- Verify `client_reference_id` is included in payment link
- Check Edge Function logs for errors
- Verify the user ID exists in profiles table

### Test webhook locally
```bash
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

---

## Security Notes

- Never expose `STRIPE_SECRET_KEY` in client code
- Always use `client_reference_id` to identify users (not email)
- The Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- Webhook signature verification prevents spoofed events
