import { createClient } from '@supabase/supabase-js'
import { chromeStorageAdapter } from './supabase-storage-adapter'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Important for Chrome extensions
  },
})

// Type definitions for our database
export type SubscriptionStatus = 'free' | 'active' | 'canceled' | 'past_due'

export interface Profile {
  id: string
  email: string | null
  is_lifetime: boolean
  stripe_customer_id: string | null
  subscription_status: SubscriptionStatus
  subscription_id: string | null
  subscription_end_date: string | null
  usage_count: number
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface WorkflowSnapshot {
  id: string
  user_id: string
  n8n_workflow_id: string
  workflow_json: Record<string, unknown>
  created_at: string
}
