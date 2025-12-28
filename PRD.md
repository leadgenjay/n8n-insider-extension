# PRD: n8n AI Copilot (Chrome Side Panel Extension)

## 1. Overview

### What We're Building
A Chrome Extension that lives in the browser's Side Panel, providing n8n automation engineers with an AI-powered assistant that can see their workflow editor, debug issues, suggest optimizations, and directly apply fixes to workflows.

### Why
n8n workflows can become complex, and debugging execution errors or optimizing node configurations requires significant expertise. An AI copilot that understands the visual context (screenshot) and data context (workflow JSON) can dramatically reduce debugging time and help users learn best practices.

### Target Users
- **Primary:** n8n developers using self-hosted instances
- **Secondary:** n8n Cloud users
- **Skill Range:** Beginner to Expert

---

## 2. Goals & Success Metrics

### Primary Goals
1. Reduce average workflow debugging time by 50%
2. Enable beginners to build complex workflows with AI guidance
3. Achieve 100 Pro tier conversions in first 3 months

### Success Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| Daily Active Users | 500+ | Supabase auth logs |
| Pro Conversion Rate | 5% | Stripe transactions / signups |
| Avg. Session Duration | 10+ min | Analytics events |
| "Fix it" Success Rate | 70%+ | User feedback + API success logs |

---

## 3. User Stories

### Authentication & Onboarding
- As a **new user**, I want to sign up with Google so that I can start quickly without creating a password.
- As a **returning user**, I want my session to persist so that I don't have to log in every time I open the panel.

### Configuration
- As a **self-hosted n8n user**, I want to configure my instance URL and API key so that the extension can access my workflows.
- As a **user**, I want to add my OpenRouter API key so that I can use AI features with my own account.
- As a **user**, I want to select my preferred AI model so that I can balance speed vs. quality.

### Core AI Features
- As a **user debugging an error**, I want to capture my current screen and ask "Why is this failing?" so that the AI can see the exact error context.
- As a **user**, I want the AI to analyze my workflow JSON and suggest optimizations so that my automations run more efficiently.
- As a **Pro user**, I want to click "Fix it for me" so that the AI applies suggested changes directly to my workflow.

### Chat Experience
- As a **user**, I want my chat history preserved for 7 days so that I can reference previous debugging sessions.
- As a **user**, I want to start a new conversation so that I can work on a different workflow without mixing context.

### Payments
- As a **Free user**, I want to see what Pro features I'm missing so that I understand the value of upgrading.
- As a **user**, I want to purchase lifetime Pro access via a simple payment link so that I don't deal with subscriptions.

---

## 4. Technical Requirements

### Architecture Overview
```text
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Extension                          │
├──────────────┬──────────────┬───────────────────────────────┤
│  Side Panel  │   Content    │        Background             │
│   (React)    │   Script     │         Worker                │
│              │              │                               │
│  - Chat UI   │  - Extract   │  - Message routing            │
│  - Settings  │    workflow  │  - Screenshot capture         │
│  - Auth      │    from DOM  │  - Storage management         │
└──────┬───────┴──────┬───────┴───────────────┬───────────────┘
       │              │                       │
       ▼              ▼                       ▼
┌─────────────┐ ┌─────────────┐       ┌─────────────┐
│  Supabase   │ │  n8n API    │       │  OpenRouter │
│  (Auth/DB)  │ │  (Workflow) │       │    (AI)     │
└─────────────┘ └─────────────┘       └─────────────┘
```

### Tech Stack
| Layer | Technology |
|-------|------------|
| Extension Framework | React 18 + Vite + CRXJS |
| Styling | TailwindCSS + Shadcn UI + Lucide Icons |
| State Management | Zustand (persisted to chrome.storage) |
| Auth & Database | Supabase |
| Payments | Stripe Payment Links + Webhooks |
| AI | OpenRouter API (client-side) |

### Chrome Extension Manifest (v3)
```json
{
  "manifest_version": 3,
  "name": "n8n AI Copilot",
  "version": "1.0.0",
  "permissions": [
    "sidePanel",
    "activeTab",
    "storage",
    "scripting",
    "tabs"
  ],
  "host_permissions": [
    "http://localhost/*",
    "https://*/*"
  ],
  "side_panel": {
    "default_path": "sidepanel.html"
  },
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_title": "Open n8n AI Copilot"
  },
  "commands": {
    "_execute_action": {
      "suggested_key": {
        "default": "Alt+J"
      }
    }
  }
}
```

### Key Technical Decisions
1. **Client-side OpenRouter calls**: User provides their own API key. Simpler architecture, no proxy needed.
2. **Broad host permissions**: Required for self-hosted n8n on any domain. Will need justification for Chrome Web Store.
3. **Supabase auth in extension**: Custom storage adapter using `chrome.storage.local` for session persistence.
4. **7-day message retention**: Query-time filtering (not scheduled deletion) for simplicity.

---

## 5. Data Model (Supabase)

### Tables

#### `profiles`
Extends Supabase auth.users with app-specific data.
```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  is_lifetime boolean default false,
  stripe_customer_id text,
  usage_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
```

#### `conversations`
Groups messages into sessions.
```sql
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text default 'New Conversation',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.conversations enable row level security;

create policy "Users can manage own conversations"
  on public.conversations for all using (auth.uid() = user_id);

create index idx_conversations_user_created
  on public.conversations(user_id, created_at desc);
```

#### `messages`
Individual chat messages with 7-day visibility.
```sql
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Users can manage own messages"
  on public.messages for all using (auth.uid() = user_id);

create index idx_messages_conversation
  on public.messages(conversation_id, created_at asc);

-- View for 7-day filtered messages
create view public.recent_messages as
  select * from public.messages
  where created_at > now() - interval '7 days';
```

#### `workflow_snapshots`
Stores original workflow state before "Fix it" modifications.
```sql
create table public.workflow_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  n8n_workflow_id text not null,
  workflow_json jsonb not null,
  created_at timestamptz default now()
);

alter table public.workflow_snapshots enable row level security;

create policy "Users can manage own snapshots"
  on public.workflow_snapshots for all using (auth.uid() = user_id);
```

### Auto-create Profile Trigger
```sql
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## 6. API Integrations

### Supabase Auth
- **Sign Up/In**: Email/Password + Google OAuth
- **Session Storage**: Custom adapter for `chrome.storage.local`

### Stripe Webhooks → Supabase
**Webhook Endpoint:** Supabase Edge Function

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@13.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!)
  const sig = req.headers.get('stripe-signature')!
  const body = await req.text()

  const event = stripe.webhooks.constructEvent(
    body,
    sig,
    Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.client_reference_id // User's Supabase UUID

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    await supabase
      .from('profiles')
      .update({
        is_lifetime: true,
        stripe_customer_id: session.customer
      })
      .eq('id', userId)
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 })
})
```

### n8n API Integration
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/workflows` | GET | List user's workflows |
| `/api/v1/workflows/:id` | GET | Fetch workflow JSON |
| `/api/v1/workflows/:id` | PATCH | Update workflow (Fix it) |
| `/api/v1/executions` | GET | Fetch recent execution logs |

**Auth Header:** `X-N8N-API-KEY: <user's key>`

### OpenRouter API
```typescript
// Direct client-side call
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${openRouterKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://n8n-copilot.com',
    'X-Title': 'n8n AI Copilot'
  },
  body: JSON.stringify({
    model: selectedModel, // e.g., 'anthropic/claude-3.5-sonnet'
    messages: conversationHistory,
    max_tokens: 4096
  })
})
```

**Available Models:**
| Display Name | OpenRouter Model ID |
|--------------|---------------------|
| Claude 3.5 Sonnet | `anthropic/claude-3.5-sonnet` |
| DeepSeek V3 | `deepseek/deepseek-chat` |
| Claude Opus 4.5 | `anthropic/claude-opus-4` |
| Gemini 1.5 Pro | `google/gemini-pro-1.5` |

---

## 7. UI Components

### Extension Structure
```text
src/
├── sidepanel/           # Side Panel React app
│   ├── App.tsx
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatContainer.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   └── ScreenshotButton.tsx
│   │   ├── settings/
│   │   │   ├── SettingsPanel.tsx
│   │   │   ├── N8nConfig.tsx
│   │   │   ├── ApiKeyInput.tsx
│   │   │   └── ModelSelector.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignupForm.tsx
│   │   │   └── AuthGuard.tsx
│   │   ├── workflow/
│   │   │   ├── WorkflowPreview.tsx
│   │   │   ├── FixPreviewModal.tsx
│   │   │   └── NodeInspector.tsx
│   │   └── ui/           # Shadcn components
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       └── ...
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useChat.ts
│   │   ├── useN8n.ts
│   │   └── useOpenRouter.ts
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── chatStore.ts
│   │   └── settingsStore.ts
│   └── lib/
│       ├── supabase.ts
│       ├── n8n-api.ts
│       └── openrouter.ts
├── background/          # Service Worker
│   └── index.ts
├── content/             # Content Script
│   └── index.ts
└── manifest.json
```

### Key Screens

#### 1. Login/Signup Screen
- Google OAuth button (primary)
- Email/password form (secondary)
- "Continue as Free" note

#### 2. Main Chat Screen
- **Header:** Logo | Connection status dot | Settings icon
- **Chat Area:** Scrollable message history with assistant/user bubbles
- **Footer (sticky):** Text input | Screenshot button | Send button

#### 3. Settings Panel (Slide-over)
- n8n Instance URL input
- n8n API Key input (masked)
- OpenRouter API Key input (masked)
- Model dropdown selector
- Connection test buttons
- Logout button

#### 4. Fix Preview Modal
- Side-by-side diff view (before/after)
- "Apply Changes" button
- "Cancel" button
- Warning about backup

### Design Tokens (Attio Standard)
```typescript
// tailwind.config.js extension
{
  theme: {
    extend: {
      boxShadow: {
        'card': '0 4px 24px -4px rgba(0, 0, 0, 0.08)',
      },
      borderRadius: {
        '2xl': '1rem',
      }
    }
  }
}
```

**Component Classes:**
```css
/* Card */
.card { @apply bg-white rounded-2xl shadow-card border border-gray-100 p-4; }

/* Data Pill */
.pill { @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100; }

/* Primary Button */
.btn-primary { @apply h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors; }
```

---

## 8. Implementation Plan

### Phase 1: Foundation (Core Extension)
1. Initialize Vite + React + CRXJS project
2. Configure TailwindCSS + Shadcn UI
3. Set up Chrome manifest v3 with side panel
4. Create basic side panel layout (header, chat area, input)
5. Implement background service worker message routing
6. Add `chrome.storage.local` wrapper utilities

### Phase 2: Authentication
7. Set up Supabase project + run schema migrations
8. Create custom Supabase storage adapter for chrome.storage
9. Implement Google OAuth flow (popup → token capture)
10. Implement email/password auth
11. Create AuthGuard component for protected routes
12. Add session persistence and refresh logic

### Phase 3: Settings & Configuration
13. Build Settings panel UI
14. Implement n8n instance URL + API key storage
15. Create n8n connection test function
16. Implement OpenRouter API key storage
17. Build model selector dropdown
18. Add connection status indicator to header

### Phase 4: Chat Core
19. Set up Zustand stores for chat state
20. Implement conversation CRUD (Supabase)
21. Build message history fetch with 7-day filter
22. Create ChatContainer with message rendering
23. Build MessageInput with send functionality
24. Implement streaming response display

### Phase 5: Smart Context
25. Create content script for n8n DOM detection
26. Implement `chrome.tabs.captureVisibleTab` for screenshots
27. Build workflow JSON extraction (DOM or API)
28. Create context payload builder
29. Add "Attach Screenshot" button to input
30. Build context preview before sending

### Phase 6: AI Integration
31. Create OpenRouter API client
32. Build conversation message formatter
33. Implement system prompt with n8n expertise
34. Add model switching logic
35. Handle streaming responses
36. Add error handling and rate limit display

### Phase 7: Fix It Feature
37. Parse AI response for workflow modifications
38. Create workflow snapshot before modification
39. Build FixPreviewModal with diff view
40. Implement n8n API PATCH call
41. Add success/error feedback
42. Create undo functionality (restore snapshot)

### Phase 8: Payments
43. Create Stripe product + lifetime price
44. Generate Payment Link with `client_reference_id` placeholder
45. Deploy Stripe webhook Edge Function
46. Implement Pro feature gates in UI
47. Add upgrade prompts for Free users
48. Test full payment → unlock flow

### Phase 9: Polish & Launch
49. Add loading states and skeleton screens
50. Implement error boundaries
51. Add analytics events (privacy-respecting)
52. Create onboarding flow for new users
53. Write Chrome Web Store listing
54. Prepare privacy policy and justification for permissions

---

## 9. Open Questions

### Technical
1. **DOM Extraction Reliability:** How stable is n8n's DOM structure? Need to test if workflow data is accessible without API.
2. **Rate Limits:** What are OpenRouter's rate limits? Should we implement client-side throttling?
3. **Extension Size:** With React + Shadcn, what's the bundle size? May need optimization.

### Product
4. **Free Tier Limits:** How many messages per day for free users? Or unlimited text-only?
5. **Pricing:** What price point for lifetime Pro? ($49? $99? $149?)
6. **Refund Policy:** How to handle refunds for lifetime purchase?

### Legal/Compliance
7. **n8n Trademark:** Can we use "n8n" in the extension name? May need "for n8n" or generic name.
8. **Chrome Web Store:** Will broad host_permissions trigger extended review? Prepare justification.
9. **Data Privacy:** Do we need to clarify that screenshots are sent to OpenRouter (third-party)?

---

## Appendix: System Prompt for AI

```markdown
You are an expert n8n automation engineer assistant. You help users debug workflows, optimize node configurations, and write JavaScript/Python code for Code and Function nodes.

When analyzing a workflow:
1. Identify the trigger and understand the data flow
2. Look for common issues: missing error handling, inefficient loops, credential problems
3. Suggest specific node configurations, not vague advice
4. When writing code, follow n8n conventions (items array, $json, $node, etc.)

When the user shares a screenshot:
- Describe what you see in the workflow canvas
- Identify any visible error messages or warning icons
- Note the node types and their connections

When suggesting fixes:
- Provide exact JSON patches when possible
- Explain why the change will fix the issue
- Warn about any potential side effects

You can modify workflows directly when asked. Always confirm before making changes.
```
