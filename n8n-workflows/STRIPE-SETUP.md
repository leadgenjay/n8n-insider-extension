# Stripe Webhook Handler - Setup Guide

## Workflow Overview

This n8n workflow handles Stripe subscription events for N8N Insider:

```
[Stripe Webhook] → [Verify Signature] → [Route by Event] → [Update Supabase] → [200 OK]
```

## Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set status='active', store customer_id & subscription_id |
| `customer.subscription.updated` | Update status and end_date based on Stripe status |
| `customer.subscription.deleted` | Set status='free', clear subscription_id |
| `invoice.payment_failed` | Set status='past_due' |

---

## Setup Instructions

### 1. Import Workflow

1. Open n8n
2. Go to **Workflows** → **Import from File**
3. Select `stripe-webhook-handler.json`
4. The workflow will be imported

### 2. Configure Supabase Credentials

1. In n8n, go to **Credentials** → **Add Credential**
2. Search for "Supabase"
3. Add:
   - **Host**: Your Supabase project URL (e.g., `https://xxx.supabase.co`)
   - **Service Role Key**: From Supabase Dashboard → Settings → API → service_role key
4. Update all Supabase nodes to use this credential

### 3. Set Environment Variable

Add `STRIPE_WEBHOOK_SECRET` to n8n environment:

```bash
# In your n8n docker-compose.yml or .env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

Get this from Stripe Dashboard after creating the webhook endpoint.

### 4. Activate Workflow

1. Toggle the workflow **Active**
2. Copy the webhook URL (shown in the Webhook node)
3. It will look like: `https://your-n8n.com/webhook/stripe-payments`

### 5. Configure Stripe Webhook

In Stripe Dashboard:

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Paste your n8n webhook URL
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add this to n8n as `STRIPE_WEBHOOK_SECRET`

---

## Stripe Product Setup

### Create Product & Price

1. Go to Stripe Dashboard → **Products**
2. Click **Add product**
3. Name: "N8N Insider Pro"
4. Price: $10.00 USD, Recurring monthly
5. Save and copy the **Price ID** (starts with `price_`)

### Create Payment Link

1. Go to **Payment Links** → **Create payment link**
2. Select your $10/month price
3. Under **After payment** → add redirect URL
4. Enable **Allow promotion codes** (optional)
5. Click **Create link**
6. Copy the payment link URL

### Enable Customer Portal

1. Go to **Settings** → **Billing** → **Customer portal**
2. Configure allowed actions:
   - Update payment method
   - Cancel subscription
   - View invoice history
3. Save and copy the portal link

---

## Update Extension Code

Replace placeholder URLs in:

### `src/components/chat/MessageInput.tsx` (line 18)
```typescript
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/YOUR_ACTUAL_LINK'
```

### `src/components/settings/SettingsPanel.tsx` (lines 11-13)
```typescript
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/YOUR_ACTUAL_LINK'
const STRIPE_PORTAL_LINK = 'https://billing.stripe.com/p/login/YOUR_PORTAL_LINK'
```

---

## Testing

### Test with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to n8n
stripe listen --forward-to https://your-n8n.com/webhook/stripe-payments

# Trigger test event
stripe trigger checkout.session.completed
```

### Test Checklist

- [ ] Checkout completed → Profile shows "Pro Plan"
- [ ] Cancel subscription → Profile shows "Pro (Canceled)" with end date
- [ ] Subscription deleted → Profile shows "Free Plan"
- [ ] Payment failed → Profile shows "Payment Failed"

---

## Troubleshooting

### "Invalid webhook signature"
- Verify `STRIPE_WEBHOOK_SECRET` is correct
- Ensure raw body is being passed (webhook node has `rawBody: true`)

### Supabase updates not working
- Check Supabase credentials have service_role key (not anon key)
- Verify `profiles` table has the subscription columns

### Events not received
- Check webhook endpoint is active in Stripe Dashboard
- Verify n8n workflow is activated
- Check n8n execution logs for errors
