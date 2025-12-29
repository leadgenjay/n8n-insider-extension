# N8N Insider - Project Handoff

**Last Updated:** December 28, 2025

---

## 🚨 URGENT: Email Confirmation Redirect Broken

### Problem
When users click "Confirm your email" in Supabase confirmation email, they get redirected to `localhost:3000` which shows "This site can't be reached" error.

### Root Cause
Supabase's Site URL is set to `http://localhost:3000` (default). Since this is a Chrome extension, there's no localhost server.

### Fix Required
1. Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**
2. Change **Site URL** from `http://localhost:3000` to your landing page URL
3. Create a simple `/auth/confirmed` page on your landing site that says:
   ```
   Email Confirmed!
   You can now close this tab and sign in using the N8N Insider extension.
   ```

---

## ✅ Completed Today (Dec 28)

| Task | Files Modified |
|------|----------------|
| Fixed AI markdown/verbosity (prompt engineering) | `src/lib/openrouter.ts` |
| Added `stripMarkdown()` defense-in-depth | `src/lib/openrouter.ts` |
| Removed Google OAuth login | `src/components/auth/LoginForm.tsx` |

### AI Markdown Fix Details
- **Problem:** AI outputting `**bold**` markdown despite instructions
- **Root Cause:** System prompt contradicted itself (used bullets while forbidding them)
- **Solution:**
  - Moved output format instructions to FIRST position (primacy effect)
  - Rewrote all sections as prose paragraphs (lead by example)
  - Added closing reminder (recency effect)
  - Added `stripMarkdown()` function as backup enforcement

### Google OAuth Removal
- **Problem:** Browser popup blocker silently blocking OAuth popup
- **Solution:** Removed Google login button entirely, now email/password only

---

## 📋 Previous Work: Stripe Subscription Integration

Implementing **$10/mo Pro subscription** with Stripe (started Dec 27).

### ✅ Completed Previously

| Task | Files |
|------|-------|
| Database migration (subscription fields) | `supabase/migrations/20250127000001_add_subscription_fields.sql` |
| Profile TypeScript interface | `src/lib/supabase.ts` |
| Pro access check (subscriptions + grace period) | `src/components/chat/MessageInput.tsx` |
| Settings Panel subscription UI | `src/components/settings/SettingsPanel.tsx` |
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

## 📊 Database Schema (Subscription Fields)

Applied to Supabase:

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

## 🏗️ Project Overview

A Chrome Extension Side Panel AI assistant for n8n workflow automation:
- **Frontend:** React + Vite + CRXJS (Manifest V3)
- **Backend:** Supabase (Auth + Postgres)
- **AI:** OpenRouter (vision-capable models)
- **Payments:** Stripe (in progress)

---

## 📁 Key Files Reference

```
src/
├── lib/
│   ├── supabase.ts              # Profile interface with subscription fields
│   └── openrouter.ts            # System prompt, AI client, stripMarkdown()
├── components/
│   ├── auth/
│   │   └── LoginForm.tsx        # Email/password login only
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

## 🚀 Next Session Priority

1. **Fix email confirmation redirect** (Supabase URL Configuration)
2. Configure Stripe MCP in Claude Code
3. Create Stripe resources via MCP
4. Update placeholder URLs in code
5. Test end-to-end subscription flow

---

## How to Build & Test

```bash
cd /Volumes/data/GITHUB/N8N-Chrome
npm run build
```

### Load in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click refresh icon on N8N Insider (or "Load unpacked" → select `dist/`)

---

## Environment Variables

Create `.env.local` in project root:
```env
VITE_SUPABASE_URL=https://yndcawdtkpqulpzxkwif.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
