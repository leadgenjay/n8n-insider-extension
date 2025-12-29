import { create } from 'zustand'
import { supabase, Profile } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  error: string | null

  // Actions
  initialize: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  fetchProfile: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  error: null,

  initialize: async () => {
    try {
      set({ loading: true, error: null })

      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) throw error

      if (session) {
        set({ user: session.user, session })
        await get().fetchProfile()
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({ user: session?.user || null, session })

        if (session) {
          await get().fetchProfile()
        } else {
          set({ profile: null })
        }
      })
    } catch (error) {
      set({ error: String(error) })
    } finally {
      set({ loading: false })
    }
  },

  signInWithEmail: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null })

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (error) {
      set({ error: String(error) })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null })

      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) throw error
    } catch (error) {
      set({ error: String(error) })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    try {
      set({ loading: true, error: null })

      const { error } = await supabase.auth.signOut()

      if (error) throw error

      set({ user: null, session: null, profile: null })
    } catch (error) {
      set({ error: String(error) })
      throw error
    } finally {
      set({ loading: false })
    }
  },

  fetchProfile: async () => {
    try {
      const user = get().user
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      set({ profile: data })
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  },
}))
