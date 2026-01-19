import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type FeedbackRating = 'thumbs_up' | 'thumbs_down'

interface FeedbackState {
  feedbackByMessageId: Record<string, FeedbackRating>
  loading: boolean

  submitFeedback: (messageId: string, rating: FeedbackRating, comment?: string) => Promise<void>
  loadUserFeedback: () => Promise<void>
  getFeedback: (messageId: string) => FeedbackRating | undefined
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  feedbackByMessageId: {},
  loading: false,

  submitFeedback: async (messageId, rating, comment) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Optimistic update
    set((state) => ({
      feedbackByMessageId: { ...state.feedbackByMessageId, [messageId]: rating }
    }))

    await supabase
      .from('message_feedback')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        rating,
        comment: comment || null,
      }, { onConflict: 'message_id,user_id' })
  },

  loadUserFeedback: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    set({ loading: true })
    const { data } = await supabase
      .from('message_feedback')
      .select('message_id, rating')
      .eq('user_id', user.id)

    const map: Record<string, FeedbackRating> = {}
    for (const item of data || []) {
      map[item.message_id] = item.rating as FeedbackRating
    }
    set({ feedbackByMessageId: map, loading: false })
  },

  getFeedback: (messageId) => get().feedbackByMessageId[messageId],
}))
