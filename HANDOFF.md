# N8N Insider - Project Handoff

**Last Updated:** January 20, 2026 (Session 2)

---

## ✅ Completed Today (Jan 20, 2026) - Session 2

### Bug Fixes

#### 1. Password Reset 404 Error (FIXED)
**Issue:** Clicking password reset link from email resulted in 404.
**Root Cause:** Supabase PKCE flow sends users to `/auth/confirm?token_hash=...&type=recovery` but route didn't exist.
**Fix:** Created `src/app/auth/confirm/route.ts` to handle PKCE token verification.

#### 2. RLS Infinite Recursion (FIXED)
**Issue:** Templates page showed "Failed to load templates" after login.
**Root Cause:** `admin_users` RLS policy was self-referential.
**Fix:** SQL executed in Supabase dashboard:
```sql
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;
CREATE POLICY "Users can view own admin record" ON public.admin_users
  FOR SELECT USING (auth_user_id = auth.uid());
```

#### 3. Broken Template Images (FIXED)
**Issue:** Template images not loading (showing alt text).
**Root Cause:** Images pointed to old Supabase but Next.js config only allowed new domain.
**Fix:** Full storage migration (see below).

### Full Storage Migration

Migrated ALL storage from old Supabase to new unified Supabase:

| Bucket | Files |
|--------|-------|
| template-images | 158 images |
| templates | 212 JSON files |
| **Total** | **370 files** |

Updated 172 template `image_url` records in database.

### UX/UI Improvements (Templates App)

| Feature | Description |
|---------|-------------|
| Toast Notifications | Replaced `alert()` with `sonner` toasts |
| Bug Report Button | Floating button to collect user feedback |
| Skeleton Loaders | Loading animations for templates page |
| Error Retry | Retry button on error states |
| Admin Protection | Verify admin role in middleware |
| Image Placeholders | Styled SVG fallback for missing images |
| Promise Handling | Fixed unhandled rejections in UserNav |

**New files created:**
- `src/app/auth/confirm/route.ts` - PKCE handler
- `src/app/templates/loading.tsx` - Loading state
- `src/components/feedback/bug-report-button.tsx`
- `src/components/templates/template-skeleton.tsx`
- `src/components/templates/templates-error.tsx`

**Git commits (n8n-LTF):**
```
3f48821 Add UX improvements: toasts, skeletons, error handling, and bug report
3dbad48 Complete storage migration to new Supabase
75917bc Allow images from old Supabase storage temporarily
73b16c4 Fix password reset 404 by adding /auth/confirm route handler
```

---

## ✅ Completed Today (Jan 20, 2026) - Session 1

### Complete Data Migration

Successfully migrated all data from old Supabase (`yndcawdtkpqulpzxkwif`) to new unified Supabase (`uprkqfygjhxudhdpqhju`).

#### Database Records Migrated

| Table | Records | Status |
|-------|---------|--------|
| templates | 172 | ✅ Migrated |
| workflow_documentation | 171 | ✅ Migrated |
| admin_users | 6 | ✅ Migrated |
| workflow_snapshots | 0 | ✅ (empty source) |

#### User Profile Migration

Created smart migration system for 597 user profiles:

| Component | Purpose |
|-----------|---------|
| `profile_migration_lookup` table | Stores old profile data by email |
| `restore_migrated_profile()` trigger | Auto-restores data when user re-registers |

When users sign up with their old email, their subscription status (is_lifetime, is_insiders, credits_balance, etc.) is automatically restored.

#### Storage Buckets Migrated

| Bucket | Files |
|--------|-------|
| templates | 33 files |
| template-previews | 15 files |

#### Migration Scripts Created

```
supabase/
├── migrate.sh                    # Export from old Supabase
├── import.sh                     # Import tables to new Supabase
├── import_admin.sh               # Import admin users
├── import_profile_migration.sh   # Import profile lookup data
├── migrate_storage.sh            # Migrate storage buckets
├── migrate_profiles.sql          # Profile migration SQL
├── DATA_MIGRATION.md             # Migration documentation
└── exports/                      # Exported JSON data
```

### Admin API Edge Function

Deployed `admin-api` Edge Function to new Supabase for managing user access.

**URL:** `https://uprkqfygjhxudhdpqhju.supabase.co/functions/v1/admin-api`
**Auth:** `Authorization: Bearer 29KqD9gM6CFIna1Kaa7Dv1diNhjHbXBjvV6PMogF`
**JWT Verification:** Disabled (uses custom API key auth)

#### Available Actions

| Action | Description |
|--------|-------------|
| `grant_pro` | Grant Chrome Extension lifetime access (is_lifetime: true) |
| `grant_insiders` | Grant Templates access (is_insiders: true) |
| `create_user` | Create new user (email + password required) |

#### n8n Workflow Example

```json
{
  "action": "grant_pro",
  "email": "user@example.com"
}
```

### Templates App API

Existing Next.js API route for user management:

**URL:** `https://templates.n8ninsider.com/api/admin/users`
**Auth:** `x-api-key` header (ADMIN_API_KEY env var)

Creates user + grants access in one call:
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "User Name",
  "is_insiders": true,
  "is_lifetime": true
}
```

### Supabase Auth Configuration

Updated in Supabase Dashboard:
- **Site URL:** `https://templates.n8ninsider.com`
- **Redirect URLs:** `https://templates.n8ninsider.com/**`, `https://n8ninsider.com/**`

---

## ✅ Completed (Jan 19, 2026)

### Unified Platform Migration

Merged two projects (n8n-insider-extension + n8n-LTF templates) into one unified platform with shared Supabase backend.

#### New Architecture

| Component | URL | Repo Location |
|-----------|-----|---------------|
| Main Site (Extension) | n8ninsider.com | `/Volumes/data/GITHUB/n8n-insider-extension/` |
| Templates App | templates.n8ninsider.com | `/Volumes/data/GITHUB/n8n-LTF/` |
| Chrome Extension | Chrome Web Store | `extension/` subfolder |
| Landing Page (WIP) | n8ninsider.com | `web/` subfolder |

#### New Supabase Project

**Project:** `uprkqfygjhxudhdpqhju`
**URL:** https://uprkqfygjhxudhdpqhju.supabase.co

Replaces the old separate projects:
- ~~yndcawdtkpqulpzxkwif~~ (old extension Supabase)
- ~~Old templates Supabase~~

### Database Schema (Unified)

Applied 12 migrations to new Supabase with complete unified schema:

| Table | Purpose |
|-------|---------|
| `profiles` | Unified user profiles (extension + templates fields) |
| `conversations` | Extension chat conversations |
| `messages` | Chat messages |
| `workflow_snapshots` | n8n workflow captures |
| `profile_audit_log` | Profile change tracking |
| `templates` | Workflow templates |
| `workflow_documentation` | Template documentation |
| `admin_users` | Admin access control |

**Schema file:** `supabase/unified-schema.sql`

### SSO Authentication

Configured cross-subdomain SSO between n8ninsider.com and templates.n8ninsider.com:

**Files updated in n8n-LTF:**
- `src/lib/supabase/server.ts` - SSO cookie domain (.n8ninsider.com)
- `src/lib/supabase/client.ts` - SSO cookie options
- `src/middleware.ts` - SSO cookie domain for session refresh

**Supabase Auth Settings:**
- Site URL: `https://n8ninsider.com`
- Redirect URLs: `https://n8ninsider.com/**`, `https://templates.n8ninsider.com/**`
- SMTP: Resend (smtp.resend.com)

### Password Reset Flow

Added complete password reset functionality to templates app:

| Page | URL | Purpose |
|------|-----|---------|
| Forgot Password | `/forgot-password` | Request reset email |
| Reset Password | `/reset-password` | Set new password |

**Files created:**
- `src/app/forgot-password/page.tsx`
- `src/app/reset-password/page.tsx`

**Files updated:**
- `src/app/login/page.tsx` - Added "Forgot password?" link

### Email Templates (Resend)

Custom branded email templates configured in Supabase for:
- Password reset emails
- Signup confirmation emails

### Repo Restructure

Extension repo restructured as monorepo:

```
n8n-insider-extension/
├── extension/          # Chrome extension (Vite + React)
│   ├── src/
│   ├── manifest.json
│   ├── vite.config.ts
│   └── .env.local      # NEW - Supabase credentials
├── web/                # Landing page (Next.js) - WIP
│   └── ...
├── supabase/
│   └── unified-schema.sql  # Complete unified schema
├── package.json        # Workspace config
└── .mcp.json           # Updated to new Supabase project
```

---

## 🔧 Environment Configuration

### Extension (`extension/.env.local`)

```env
VITE_SUPABASE_URL=https://uprkqfygjhxudhdpqhju.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwcmtxZnlnamh4dWRoZHBxaGp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY4MDE2MDcsImV4cCI6MjA1MjM3NzYwN30.LYT1GHHHb3r6Z5T1SrHMiRQ5fVbF4bUMYl23JoqGKqk
```

### Templates App (`n8n-LTF/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://uprkqfygjhxudhdpqhju.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_API_KEY=29KqD9gM6CFIna1Kaa7Dv1diNhjHbXBjvV6PMogF
```

### Vercel Environment Variables

Update in Vercel dashboard for templates app:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 📋 Remaining Tasks

### Immediate
- [x] Test password reset flow end-to-end
- [x] Verify SSO works across subdomains
- [x] Configure DNS for templates.n8ninsider.com

### Data Migration (COMPLETED)
- [x] Migrate templates from old database (172 records)
- [x] Migrate workflow_documentation (171 records)
- [x] Migrate admin_users (6 records)
- [x] Migrate storage buckets (templates, template-previews)
- [x] Create profile migration lookup (597 profiles)
- [x] Deploy admin-api Edge Function

### Optional Future Tasks
- [ ] Migrate old conversations/messages (if needed for history)
- [ ] Update n8n workflows with new API endpoints
- [ ] Configure custom SMTP sender email (noreply@n8ninsider.com)

---

## 🏗️ How to Build & Test

### Extension

```bash
cd /Volumes/data/GITHUB/n8n-insider-extension/extension
npm install
npm run build
```

Load in Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Load unpacked → select `extension/dist/`

### Templates App

```bash
cd /Volumes/data/GITHUB/n8n-LTF
npm install
npm run dev
```

---

## 📁 Key Files Reference

### Extension
```
extension/
├── src/lib/supabase.ts           # Supabase client with Chrome storage
├── src/stores/authStore.ts       # Auth state management
└── .env.local                    # Supabase credentials
```

### Templates App
```
n8n-LTF/src/
├── lib/supabase/
│   ├── client.ts                 # Browser client with SSO
│   └── server.ts                 # Server client with SSO
├── middleware.ts                 # Session refresh with SSO cookies
├── app/
│   ├── login/page.tsx            # Login with forgot password link
│   ├── forgot-password/page.tsx  # Request password reset
│   └── reset-password/page.tsx   # Set new password
└── .env.local                    # Supabase + admin credentials
```

---

## Git Status

All changes committed and pushed to main branches.

**Recent commits (n8n-insider-extension):**
- `510fb13` - Restructure repo for unified platform with new Supabase

**Recent commits (n8n-LTF):**
- `03eca8b` - Add SSO authentication and password reset flow

---

## Previous Documentation

See git history for previous HANDOFF.md content covering:
- Admin API Edge Function
- Web Search Integration (Tavily)
- Stripe Subscription Integration (in progress)
- AI Markdown fixes
- Welcome Modal implementation
