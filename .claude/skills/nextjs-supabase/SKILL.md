---
name: nextjs-supabase
description: Build Next.js apps with Supabase. Use for auth, database, CRUD operations, server components, and Supabase client setup.
---

# Next.js + Supabase Development

## Supabase Client Setup
- Server: Use `createServerClient` from `@supabase/ssr`
- Client: Use `createBrowserClient` from `@supabase/ssr`
- Middleware: Handle auth session refresh

## Auth Patterns
- Use Supabase Auth with email/password or OAuth
- Protect routes in middleware.ts
- Access user in Server Components via cookies

## Database Patterns
- Use typed Supabase client with database.types.ts
- Server Components: Direct Supabase queries
- Client Components: Use SWR or React Query
- Always implement Row Level Security (RLS)

## File Structure
- `/lib/supabase/server.ts` - Server client
- `/lib/supabase/client.ts` - Browser client
- `/lib/supabase/middleware.ts` - Middleware client
- `/types/database.types.ts` - Generated types

## Common Patterns

### Server Component with Supabase
```typescript
import { createServerClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createServerClient()
  const { data: items } = await supabase.from('items').select('*')
  return <ItemList items={items} />
}
```

### Protected API Route
```typescript
import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Handle authenticated request
}
```

### RLS Policy Template
```sql
-- Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own items
CREATE POLICY "Users can view own items"
  ON items FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own items
CREATE POLICY "Users can insert own items"
  ON items FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```
