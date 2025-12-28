# N8N Insider - Project Handoff

**Last Updated:** December 27, 2025

---

## 🎯 Current Work: Stripe Subscription Integration

Implementing **$10/mo Pro subscription** with Stripe for the N8N Insider Chrome Extension.

### ✅ Completed Today

| Task | Files Modified |
|------|----------------|
| Database migration (subscription fields) | `supabase/migrations/20250127000001_add_subscription_fields.sql` |
| Profile TypeScript interface | `src/lib/supabase.ts` |
| Pro access check (subscriptions + grace period) | `src/components/chat/MessageInput.tsx` |
| Settings Panel subscription UI | `src/components/settings/SettingsPanel.tsx` |
| Usage blocked upgrade CTA | `src/components/chat/MessageInput.tsx` |
| N8N webhook workflow | `n8n-workflows/stripe-webhook-handler.json` |
| Setup guide | `n8n-workflows/STRIPE-SETUP.md` |

### ⏳ Remaining (Stripe Setup)

| Task | How |
|------|-----|
| **Configure Stripe MCP** | Add to Claude Code MCP config (see below) |
| **Create Stripe Product** | "N8N Insider Pro" - $10/month recurring |
| **Create Payment Link** | With `client_reference_id` parameter |
| **Set up Customer Portal** | For subscription management |
| **Update placeholder URLs** | Replace in MessageInput.tsx & SettingsPanel.tsx |
| **Configure Stripe webhook** | Point to n8n workflow URL |
| **Import n8n workflow** | Import JSON, configure Supabase credentials |

---

## 🔧 Stripe MCP Configuration

Add to your Claude Code MCP config to continue Stripe setup:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@stripe/mcp", "--tools=all", "--api-key", "sk_test_or_live_xxx"]
    }
  }
}
```

Then ask Claude to:
1. Create product "N8N Insider Pro"
2. Create price $10/month recurring
3. Create payment link with `client_reference_id`
4. Set up webhook endpoint pointing to n8n

---

## 📝 Code Placeholders to Replace

### `src/components/chat/MessageInput.tsx` (line 18)
```typescript
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/YOUR_PAYMENT_LINK'
```

### `src/components/settings/SettingsPanel.tsx` (lines 11-13)
```typescript
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/YOUR_PAYMENT_LINK'
const STRIPE_PORTAL_LINK = 'https://billing.stripe.com/p/login/YOUR_PORTAL_LINK'
```

---

## 📊 Database Schema (New Fields)

Applied to Supabase via MCP:

```sql
-- Added to profiles table
subscription_status text DEFAULT 'free'    -- 'free', 'active', 'canceled', 'past_due'
subscription_id text                        -- Stripe subscription ID
subscription_end_date timestamptz           -- For grace period on cancellation

-- Indexes created
idx_profiles_subscription_id
idx_profiles_stripe_customer_id
```

---

## 📁 New Files Created Today

```
n8n-workflows/
├── stripe-webhook-handler.json    # Import to n8n
└── STRIPE-SETUP.md                # Full setup instructions

supabase/migrations/
└── 20250127000001_add_subscription_fields.sql
```

---

## 🔄 Other Fixes Made Today

| Fix | File |
|-----|------|
| AI response quality (stricter prompt, no markdown) | `src/lib/openrouter.ts` |
| n8n AI Agent fallback model knowledge | `src/lib/openrouter.ts` |
| Expressions as plain text (no backticks) | `src/lib/openrouter.ts` |
| Feedback follow-up on thumbs down | `src/components/chat/MessageFeedback.tsx` |
| Title generation after 2 messages (was 3) | `src/stores/chatStore.ts` |

---

## ✅ Build Status

Build passes successfully:
```bash
npm run build  # ✅ Completes without errors
```

---

## 🏗️ Project Overview

A Chrome Extension Side Panel AI assistant for n8n workflow automation:
- **Frontend:** React + Vite + CRXJS (Manifest V3)
- **Backend:** Supabase (Auth + Postgres)
- **AI:** OpenRouter (vision-capable models)
- **Payments:** Stripe (in progress)

---

## 📋 Key Files Reference

```
src/
├── lib/
│   ├── supabase.ts              # Profile interface with subscription fields
│   └── openrouter.ts            # System prompt, AI client
├── components/
│   ├── chat/
│   │   ├── MessageInput.tsx     # isPro() function, upgrade CTA
│   │   └── MessageFeedback.tsx  # Thumbs up/down with follow-up
│   └── settings/
│       └── SettingsPanel.tsx    # SubscriptionCard component
└── stores/
    ├── chatStore.ts             # Conversations, title generation
    └── feedbackStore.ts         # Feedback persistence
```

---

## 🚀 Next Session: Continue Stripe Setup

1. Configure Stripe MCP in Claude Code
2. Use MCP to create Stripe resources
3. Update placeholder URLs in code
4. Import n8n workflow and configure
5. Test end-to-end subscription flow

---

*Previous handoff content preserved below for reference*

---

# Previous Project State (Dec 26, 2024)

## Configuration Required

### Environment Variables
Create `.env.local` in project root:
```env
VITE_SUPABASE_URL=https://yndcawdtkpqulpzxkwif.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Supabase Project
- **Project ID:** `yndcawdtkpqulpzxkwif`
- **URL:** `https://yndcawdtkpqulpzxkwif.supabase.co`

## How to Build & Test

```bash
cd /Volumes/data/GITHUB/N8N-Chrome
npm run build
```

### Load in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

## AI Models Configured

| Model ID | Name |
|----------|------|
| `anthropic/claude-3.5-sonnet` | Claude 3.5 Sonnet (Default) |
| `deepseek/deepseek-chat` | DeepSeek V3 |
| `anthropic/claude-opus-4` | Claude Opus 4.5 |
| `google/gemini-pro-1.5` | Gemini 1.5 Pro |
