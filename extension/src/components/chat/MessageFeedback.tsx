import { ThumbsUp, ThumbsDown, X, Send } from 'lucide-react'
import { useState } from 'react'
import { useFeedbackStore, type FeedbackRating } from '@/stores/feedbackStore'
import { cn } from '@/lib/utils'

interface MessageFeedbackProps {
  messageId: string
}

const QUICK_REASONS = [
  { label: 'Wrong', value: 'Wrong answer' },
  { label: 'Verbose', value: 'Too verbose' },
  { label: 'Format', value: 'Formatting issues' },
  { label: '?', value: 'Misunderstood question' },
]

export function MessageFeedback({ messageId }: MessageFeedbackProps) {
  const { getFeedback, submitFeedback } = useFeedbackStore()
  const currentRating = getFeedback(messageId)
  const [showFollowUp, setShowFollowUp] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string | null>(null)
  const [customComment, setCustomComment] = useState('')

  const handleFeedback = async (rating: FeedbackRating) => {
    // Toggle off if clicking same rating
    if (currentRating === rating) return

    if (rating === 'thumbs_down') {
      // Show follow-up for thumbs down
      setShowFollowUp(true)
      await submitFeedback(messageId, rating)
    } else {
      await submitFeedback(messageId, rating)
      setShowFollowUp(false)
    }
  }

  const handleSubmitComment = async () => {
    const comment = selectedReason
      ? customComment
        ? `${selectedReason}: ${customComment}`
        : selectedReason
      : customComment

    if (comment) {
      await submitFeedback(messageId, 'thumbs_down', comment)
    }
    setShowFollowUp(false)
    setSelectedReason(null)
    setCustomComment('')
  }

  const handleDismiss = () => {
    setShowFollowUp(false)
    setSelectedReason(null)
    setCustomComment('')
  }

  return (
    <div className="mt-1">
      {/* Thumbs buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleFeedback('thumbs_up')}
          className={cn(
            'p-1 rounded hover:bg-green-100 transition-colors',
            currentRating === 'thumbs_up' && 'bg-green-100 text-green-600'
          )}
          title="Helpful"
        >
          <ThumbsUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleFeedback('thumbs_down')}
          className={cn(
            'p-1 rounded hover:bg-red-100 transition-colors',
            currentRating === 'thumbs_down' && 'bg-red-100 text-red-600'
          )}
          title="Not helpful"
        >
          <ThumbsDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Follow-up panel for thumbs down */}
      {showFollowUp && currentRating === 'thumbs_down' && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-red-700 font-medium">What could improve?</span>
            <button
              onClick={handleDismiss}
              className="p-0.5 hover:bg-red-100 rounded"
              title="Dismiss"
            >
              <X className="w-3 h-3 text-red-600" />
            </button>
          </div>

          {/* Quick select reasons */}
          <div className="flex flex-wrap gap-1 mb-2">
            {QUICK_REASONS.map((reason) => (
              <button
                key={reason.value}
                onClick={() => setSelectedReason(
                  selectedReason === reason.value ? null : reason.value
                )}
                className={cn(
                  'px-2 py-0.5 rounded text-xs border transition-colors',
                  selectedReason === reason.value
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-red-700 border-red-300 hover:bg-red-100'
                )}
              >
                {reason.label}
              </button>
            ))}
          </div>

          {/* Custom comment input */}
          <div className="flex gap-1">
            <input
              type="text"
              value={customComment}
              onChange={(e) => setCustomComment(e.target.value)}
              placeholder="Other feedback..."
              className="flex-1 px-2 py-1 text-xs border border-red-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-red-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmitComment()
                }
              }}
            />
            <button
              onClick={handleSubmitComment}
              disabled={!selectedReason && !customComment}
              className={cn(
                'p-1 rounded transition-colors',
                selectedReason || customComment
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-red-200 text-red-400 cursor-not-allowed'
              )}
              title="Send feedback"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
