import { create } from 'zustand'
import { supabase, Conversation, Message } from '@/lib/supabase'
import { generateConversationTitle } from '@/lib/openrouter'

interface ChatState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: Message[]
  loading: boolean
  sending: boolean
  error: string | null

  // Actions
  fetchConversations: () => Promise<void>
  createConversation: (title?: string) => Promise<Conversation>
  selectConversation: (conversationId: string) => Promise<void>
  deleteConversation: (conversationId: string) => Promise<void>
  fetchMessages: (conversationId: string) => Promise<void>
  addMessage: (role: 'user' | 'assistant' | 'system', content: string, metadata?: Record<string, unknown>) => Promise<Message>
  updateConversationTitle: (conversationId: string, title: string) => Promise<void>
  generateAndSetTitle: () => Promise<void>
  clearMessages: () => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  loading: false,
  sending: false,
  error: null,

  fetchConversations: async () => {
    try {
      set({ loading: true, error: null })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      set({ conversations: data || [] })

      // If no conversations exist, create one
      if (!data || data.length === 0) {
        await get().createConversation()
      } else if (!get().currentConversation) {
        // Select the first conversation
        await get().selectConversation(data[0].id)
      }
    } catch (error) {
      set({ error: String(error) })
    } finally {
      set({ loading: false })
    }
  },

  createConversation: async (title = 'New Conversation') => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title })
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        conversations: [data, ...state.conversations],
        currentConversation: data,
        messages: [],
      }))

      return data
    } catch (error) {
      set({ error: String(error) })
      throw error
    }
  },

  selectConversation: async (conversationId: string) => {
    try {
      const conversation = get().conversations.find((c) => c.id === conversationId)
      if (!conversation) throw new Error('Conversation not found')

      set({ currentConversation: conversation })
      await get().fetchMessages(conversationId)
    } catch (error) {
      set({ error: String(error) })
    }
  },

  deleteConversation: async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      if (error) throw error

      set((state) => ({
        conversations: state.conversations.filter((c) => c.id !== conversationId),
        currentConversation: state.currentConversation?.id === conversationId ? null : state.currentConversation,
        messages: state.currentConversation?.id === conversationId ? [] : state.messages,
      }))

      // If we deleted the current conversation, select another one
      if (get().currentConversation === null) {
        const remaining = get().conversations
        if (remaining.length > 0) {
          await get().selectConversation(remaining[0].id)
        } else {
          await get().createConversation()
        }
      }
    } catch (error) {
      set({ error: String(error) })
    }
  },

  fetchMessages: async (conversationId: string) => {
    try {
      set({ loading: true, error: null })

      // Use recent_messages view for 7-day filter
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      if (error) throw error

      set({ messages: data || [] })
    } catch (error) {
      set({ error: String(error) })
    } finally {
      set({ loading: false })
    }
  },

  addMessage: async (role, content, metadata = {}) => {
    try {
      set({ sending: true, error: null })

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const conversation = get().currentConversation
      if (!conversation) throw new Error('No conversation selected')

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role,
          content,
          metadata,
        })
        .select()
        .single()

      if (error) throw error

      set((state) => ({
        messages: [...state.messages, data],
      }))

      return data
    } catch (error) {
      set({ error: String(error) })
      throw error
    } finally {
      set({ sending: false })
    }
  },

  updateConversationTitle: async (conversationId: string, title: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title, updated_at: new Date().toISOString() })
        .eq('id', conversationId)

      if (error) throw error

      // Update local state
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, title } : c
        ),
        currentConversation:
          state.currentConversation?.id === conversationId
            ? { ...state.currentConversation, title }
            : state.currentConversation,
      }))
    } catch (error) {
      console.error('Failed to update conversation title:', error)
    }
  },

  generateAndSetTitle: async () => {
    const { currentConversation, messages } = get()

    // Only generate title if:
    // 1. We have a current conversation
    // 2. The title is still the default "New Conversation"
    // 3. We have at least 2 messages (user question + assistant response)
    if (
      !currentConversation ||
      currentConversation.title !== 'New Conversation' ||
      messages.length < 2
    ) {
      return
    }

    console.log('[chatStore] Generating conversation title...')

    try {
      // Get the first few messages for title generation
      const recentMessages = messages.slice(0, 4).map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const title = await generateConversationTitle(recentMessages)

      if (title && title !== 'New Conversation') {
        await get().updateConversationTitle(currentConversation.id, title)
        console.log('[chatStore] Title updated to:', title)
      }
    } catch (error) {
      console.error('[chatStore] Failed to generate title:', error)
    }
  },

  clearMessages: () => {
    set({ messages: [] })
  },
}))
