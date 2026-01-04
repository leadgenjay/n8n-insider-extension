# N8N Insider - Project Handoff

**Last Updated:** January 4, 2026

---

## ✅ Completed Today (Jan 4, 2026)

### Admin API Edge Function

Created a new Supabase Edge Function for user management via API (designed for n8n integration).

**Endpoint:** `https://yndcawdtkpqulpzxkwif.supabase.co/functions/v1/admin-api`

| Action | Required Fields | Description |
|--------|----------------|-------------|
| `create_user` | email, password | Create new user (no email verification) |
| `grant_pro` | email | Set `is_lifetime = true` |
| `revoke_pro` | email | Set `is_lifetime = false` |
| `get_user` | email | Get user profile details |
| `list_users` | - | List all users with status |

**Authentication:** Bearer token via `Authorization: Bearer <ADMIN_API_KEY>` header

**Files:**
- `supabase/functions/admin-api/index.ts` - Edge Function code

**Setup:**
1. Set secret in Supabase Dashboard → Functions → Manage Secrets
2. Add `ADMIN_API_KEY` with your chosen key

**n8n Usage Example:**
```
POST https://yndcawdtkpqulpzxkwif.supabase.co/functions/v1/admin-api
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "action": "create_user",
  "email": "newuser@example.com",
  "password": "tempPassword123"
}
```

### Extension Download Updated

- Rebuilt `n8n-insider-latest.zip` with web search feature
- Deployed to https://n8ninsider.com/download via n8n-insiders Vercel project

---

## ✅ Completed Yesterday (Jan 3, 2026)

### New Features Implemented

| Feature | Description | Files Modified |
|---------|-------------|----------------|
| **New Conversation on Load** | Automatically creates a fresh conversation each time the extension opens | `src/sidepanel/App.tsx` |
| **Web Search for API Docs** | AI can search Tavily for API documentation when troubleshooting | Multiple (see below) |
| **Conversation Naming Diagnostics** | Added logging to debug title generation issues | `src/stores/chatStore.ts`, `src/lib/openrouter.ts` |

### Web Search Integration (Tavily)

Complete implementation allowing AI to search for API documentation:

| File | Changes |
|------|---------|
| `src/lib/web-search.ts` | **NEW** - Tavily API integration for search + URL fetching |
| `src/lib/n8n-tools.ts` | Added `WEB_SEARCH_TOOLS` (search_documentation, fetch_url) |
| `src/lib/tool-executor.ts` | Added handlers for web search tools with input validation |
| `src/lib/openrouter.ts` | Updated system prompt with API troubleshooting flow |
| `src/stores/settingsStore.ts` | Added Tavily API key config + connection test |
| `src/components/settings/SettingsPanel.tsx` | Added Tavily settings UI section |

### Security Fixes Applied

| Issue | Fix | File |
|-------|-----|------|
| **SSRF Vulnerability** | Added URL validation blocking localhost/private IPs | `src/lib/web-search.ts` |
| **Missing Input Validation** | Added type checking for tool arguments | `src/lib/tool-executor.ts` |

### User Flow for Web Search

1. User encounters API error (401, 403, etc.)
2. AI asks: "Do you have documentation for this API, or would you like me to search for it?"
3. If user provides URL → AI uses `fetch_url` to read docs
4. If user says "search" → AI uses `search_documentation` via Tavily
5. AI provides informed guidance based on actual documentation

### Tavily Setup (Optional)

Users can enable web search by:
1. Go to Settings in the extension
2. Add Tavily API key (free tier: 1000 searches/month)
3. Get key at https://tavily.com

---

## 🔧 Environment Setup Fixed

### Issue: Blank Sidepanel on Fresh Install

**Problem:** Extension showed blank white panel with console error "supabaseUrl is required"

**Root Cause:** Missing `.env.local` file with Supabase credentials

**Solution:** Created `.env.local` with correct credentials:

```env
VITE_SUPABASE_URL=https://yndcawdtkpqulpzxkwif.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluZGNhd2R0a3BxdWxwenhrd2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDUxODMsImV4cCI6MjA2MzE4MTE4M30.1tyiU5AMZsIZZ08rviq-tFC6_oJpMZH6sdIF5FxnZyI
```

**Important:** The `.env.local` file is required for builds. It contains the Supabase anon key (safe to embed in client-side code).

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

## ✅ Completed Previously (Dec 28)

| Task | Files Modified |
|------|----------------|
| Fixed AI markdown/verbosity (prompt engineering) | `src/lib/openrouter.ts` |
| Added `stripMarkdown()` defense-in-depth | `src/lib/openrouter.ts` |
| Removed Google OAuth login | `src/components/auth/LoginForm.tsx` |
| Added Welcome Modal for new users | `src/components/auth/WelcomeModal.tsx` |

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
- **Web Search:** Tavily (optional, for API doc lookup)

---

## 📁 Key Files Reference

```
src/
├── lib/
│   ├── supabase.ts              # Profile interface with subscription fields
│   ├── openrouter.ts            # System prompt, AI client, stripMarkdown()
│   ├── web-search.ts            # Tavily API integration
│   ├── n8n-tools.ts             # Tool definitions (n8n + web search)
│   └── tool-executor.ts         # Tool execution handlers
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx        # Email/password login only
│   │   └── WelcomeModal.tsx     # First-time user welcome video
│   ├── chat/
│   │   ├── MessageInput.tsx     # isPro() function, upgrade CTA
│   │   └── MessageFeedback.tsx  # Thumbs up/down with follow-up
│   └── settings/
│       └── SettingsPanel.tsx    # SubscriptionCard + Tavily config
├── sidepanel/
│   └── App.tsx                  # Main app with auto-conversation creation
└── stores/
    ├── chatStore.ts             # Conversations, title generation
    ├── settingsStore.ts         # API keys, model selection, Tavily
    └── feedbackStore.ts         # Feedback persistence

supabase/
└── functions/
    ├── admin-api/
    │   └── index.ts             # Admin API for user management (n8n integration)
    └── stripe-webhook/
        └── index.ts             # Stripe payment webhook handler
```

---

## 🚀 Next Session Priority

1. **Fix email confirmation redirect** (Supabase URL Configuration)
2. **Test conversation naming** - Check console logs to debug title generation
3. Configure Stripe MCP in Claude Code
4. Create Stripe resources via MCP
5. Update placeholder URLs in code
6. Test end-to-end subscription flow
7. **Investigate inbox-insiders Vercel** - User reported it shows landing page content (not modified by this session)

---

## How to Build & Test

```bash
cd /Volumes/data/GITHUB/n8n-insider-extension
npm install
npm run build
```

### Load in Chrome
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click refresh icon on N8N Insider (or "Load unpacked" → select `dist/`)

---

## Environment Variables

Create `.env.local` in project root (REQUIRED for build):

```env
VITE_SUPABASE_URL=https://yndcawdtkpqulpzxkwif.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluZGNhd2R0a3BxdWxwenhrd2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MDUxODMsImV4cCI6MjA2MzE4MTE4M30.1tyiU5AMZsIZZ08rviq-tFC6_oJpMZH6sdIF5FxnZyI
```

---

## Git Status

All changes committed and pushed to main branch.

**Recent commits:**
- `58991f3` - Add admin API Edge Function for user management
- `8dc9f4e` - Add web search for API docs and auto-create conversation on load
- `a223e75` - Add Loom video walkthrough and welcome modal
