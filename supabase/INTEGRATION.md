# Supabase Integration Guide for Chrome Extension

This guide shows how to integrate the Supabase backend into your Chrome extension.

## Installation

```bash
npm install @supabase/supabase-js
```

## Chrome Extension Storage Adapter

Supabase needs a custom storage adapter to work with `chrome.storage.local`:

```typescript
// src/lib/supabase-storage-adapter.ts
import type { SupabaseClientOptions } from '@supabase/supabase-js'

export const chromeStorageAdapter: SupabaseClientOptions<'public'>['auth']['storage'] = {
  getItem: async (key: string) => {
    const result = await chrome.storage.local.get(key)
    return result[key] ?? null
  },
  setItem: async (key: string, value: string) => {
    await chrome.storage.local.set({ [key]: value })
  },
  removeItem: async (key: string) => {
    await chrome.storage.local.remove(key)
  },
}
```

## Initialize Supabase Client

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { chromeStorageAdapter } from './supabase-storage-adapter'
import type { Database } from '../types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for extensions
  },
})
```

## TypeScript Types

After running migrations, generate types:

```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/supabase.ts
```

Use types in your code:

```typescript
// src/types/database.types.ts
import type { Database } from './supabase'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type Conversation = Database['public']['Tables']['conversations']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type WorkflowSnapshot = Database['public']['Tables']['workflow_snapshots']['Row']
```

## Authentication

### Sign Up with Email

```typescript
// src/hooks/useAuth.ts
import { supabase } from '../lib/supabase'

export async function signUpWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) throw error

  // Profile is auto-created by trigger
  return data.user
}
```

### Sign In with Email

```typescript
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data.user
}
```

### Sign In with Google OAuth

```typescript
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      // Redirect to extension page after auth
      redirectTo: chrome.runtime.getURL('sidepanel.html'),
    },
  })

  if (error) throw error
  return data
}
```

### Check Auth State

```typescript
export function useAuthState() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

### Sign Out

```typescript
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
```

## Profile Management

### Get User Profile

```typescript
import type { Profile } from '../types/database.types'

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}
```

### Update Profile Email (Safe Function)

```typescript
export async function updateProfileEmail(newEmail: string) {
  const { error } = await supabase.rpc('update_profile_email', {
    new_email: newEmail,
  })

  if (error) throw error
}
```

### Check Pro Status

```typescript
export async function isProUser(userId: string): Promise<boolean> {
  const profile = await getProfile(userId)
  return profile?.is_lifetime ?? false
}
```

## Conversations

### Create Conversation

```typescript
export async function createConversation(
  userId: string,
  title: string = 'New Conversation'
) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title })
    .select()
    .single()

  if (error) throw error
  return data
}
```

### Get User Conversations

```typescript
export async function getUserConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error
  return data
}
```

### Delete Conversation

```typescript
export async function deleteConversation(conversationId: string) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)

  if (error) throw error
}
```

## Messages

### Add Message to Conversation

```typescript
import type { Message } from '../types/database.types'

export async function addMessage(
  conversationId: string,
  userId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata: Record<string, any> = {}
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      role,
      content,
      metadata,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

### Get Conversation Messages

```typescript
export async function getConversationMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}
```

### Get Recent Messages (7-day filter)

```typescript
export async function getRecentMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('recent_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}
```

## Workflow Snapshots

### Create Snapshot Before Modification

```typescript
export async function createWorkflowSnapshot(
  userId: string,
  n8nWorkflowId: string,
  workflowJson: object
) {
  const { data, error } = await supabase
    .from('workflow_snapshots')
    .insert({
      user_id: userId,
      n8n_workflow_id: n8nWorkflowId,
      workflow_json: workflowJson,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
```

### Get Latest Snapshot for Workflow

```typescript
export async function getLatestSnapshot(
  userId: string,
  n8nWorkflowId: string
) {
  const { data, error } = await supabase
    .from('workflow_snapshots')
    .select('*')
    .eq('user_id', userId)
    .eq('n8n_workflow_id', n8nWorkflowId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No snapshots found
    throw error
  }

  return data
}
```

### Restore Workflow from Snapshot

```typescript
import { updateN8nWorkflow } from './n8n-api'

export async function restoreWorkflowFromSnapshot(
  snapshotId: string,
  n8nInstanceUrl: string,
  n8nApiKey: string
) {
  // Get snapshot
  const { data: snapshot, error } = await supabase
    .from('workflow_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .single()

  if (error) throw error

  // Restore to n8n
  await updateN8nWorkflow(
    n8nInstanceUrl,
    n8nApiKey,
    snapshot.n8n_workflow_id,
    snapshot.workflow_json
  )

  return snapshot
}
```

## Real-time Subscriptions (Optional)

Listen to new messages in a conversation:

```typescript
export function subscribeToConversation(
  conversationId: string,
  onNewMessage: (message: Message) => void
) {
  const subscription = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(payload.new as Message)
      }
    )
    .subscribe()

  return () => {
    subscription.unsubscribe()
  }
}
```

## Error Handling

```typescript
import type { PostgrestError } from '@supabase/supabase-js'

export function handleSupabaseError(error: PostgrestError) {
  switch (error.code) {
    case '23505': // unique_violation
      return 'This record already exists'
    case '23503': // foreign_key_violation
      return 'Referenced record does not exist'
    case '42501': // insufficient_privilege (RLS)
      return 'You do not have permission to perform this action'
    case 'PGRST116': // no rows returned
      return 'Record not found'
    default:
      return error.message
  }
}
```

## Usage in React Components

### Profile Component

```typescript
// src/components/Profile.tsx
import { useEffect, useState } from 'react'
import { useAuthState } from '../hooks/useAuth'
import { getProfile } from '../lib/database'
import type { Profile } from '../types/database.types'

export function ProfileComponent() {
  const { user } = useAuthState()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (user) {
      getProfile(user.id).then(setProfile)
    }
  }, [user])

  if (!profile) return <div>Loading...</div>

  return (
    <div>
      <h2>{profile.email}</h2>
      <p>Status: {profile.is_lifetime ? 'Pro' : 'Free'}</p>
      <p>Usage: {profile.usage_count} requests</p>
    </div>
  )
}
```

### Chat Component

```typescript
// src/components/Chat.tsx
import { useEffect, useState } from 'react'
import { getConversationMessages, addMessage } from '../lib/database'
import type { Message } from '../types/database.types'

export function ChatComponent({ conversationId, userId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')

  useEffect(() => {
    loadMessages()
  }, [conversationId])

  async function loadMessages() {
    const msgs = await getConversationMessages(conversationId)
    setMessages(msgs)
  }

  async function handleSend() {
    if (!input.trim()) return

    // Add user message
    const userMsg = await addMessage(
      conversationId,
      userId,
      'user',
      input
    )
    setMessages((prev) => [...prev, userMsg])
    setInput('')

    // TODO: Call AI and add assistant response
  }

  return (
    <div>
      <div className="messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
      />
    </div>
  )
}
```

## Environment Variables Setup

Create `.env.local`:

```bash
# Public (safe to expose in extension)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# For development only
VITE_N8N_INSTANCE_URL=http://localhost:5678
```

## Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [crx({ manifest })],
  envPrefix: 'VITE_',
})
```

## Testing

### Unit Tests

```typescript
// src/lib/__tests__/database.test.ts
import { describe, it, expect, beforeAll } from 'vitest'
import { createConversation, getProfile } from '../database'

describe('Database operations', () => {
  let testUserId: string

  beforeAll(async () => {
    // Set up test user
    const { data } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'test123',
    })
    testUserId = data.user!.id
  })

  it('should create conversation', async () => {
    const conv = await createConversation(testUserId, 'Test Chat')
    expect(conv.title).toBe('Test Chat')
    expect(conv.user_id).toBe(testUserId)
  })

  it('should get profile', async () => {
    const profile = await getProfile(testUserId)
    expect(profile?.id).toBe(testUserId)
    expect(profile?.is_lifetime).toBe(false)
  })
})
```

## Best Practices

1. **Always use RPC functions for sensitive updates** (e.g., `update_profile_email`)
2. **Validate user input** before sending to database
3. **Handle errors gracefully** with user-friendly messages
4. **Use TypeScript types** from generated schema
5. **Implement optimistic updates** for better UX
6. **Cache profile data** in Zustand/React Query
7. **Test RLS policies** with different user contexts
8. **Monitor usage_count** for rate limiting

## Next Steps

1. Implement authentication flow in extension
2. Create Zustand stores for state management
3. Build chat UI components
4. Integrate with n8n API
5. Add OpenRouter AI integration
6. Test payment flow with Stripe

## Resources

- [Supabase JS Client Docs](https://supabase.com/docs/reference/javascript)
- [Chrome Extension Storage](https://developer.chrome.com/docs/extensions/reference/storage/)
- [React Hooks for Supabase](https://github.com/supabase-community/supabase-auth-helpers)
