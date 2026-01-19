import { User, Bot, Copy, Check } from 'lucide-react'
import { useState, useMemo, memo } from 'react'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/supabase'
import { CodeBlock } from './CodeBlock'
import { MessageFeedback } from './MessageFeedback'

interface MessageBubbleProps {
  message: Message
}

// Detect and extract JSON blocks from message content
function parseContentForJson(content: string): Array<{ type: 'text' | 'json'; content: string }> {
  const parts: Array<{ type: 'text' | 'json'; content: string }> = []

  // Pattern to match JSON objects or arrays
  // Look for standalone JSON that starts with { or [
  const jsonPattern = /(?:^|\n)(\{[\s\S]*?\}|\[[\s\S]*?\])(?:\n|$)/g

  let lastIndex = 0
  let match

  while ((match = jsonPattern.exec(content)) !== null) {
    const potentialJson = match[1]

    // Try to parse it as JSON
    try {
      JSON.parse(potentialJson)

      // Add any text before this JSON
      if (match.index > lastIndex) {
        const textBefore = content.slice(lastIndex, match.index).trim()
        if (textBefore) {
          parts.push({ type: 'text', content: textBefore })
        }
      }

      // Format the JSON nicely
      const formatted = JSON.stringify(JSON.parse(potentialJson), null, 2)
      parts.push({ type: 'json', content: formatted })

      lastIndex = match.index + match[0].length
    } catch {
      // Not valid JSON, skip
    }
  }

  // Add any remaining text
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex).trim()
    if (remainingText) {
      parts.push({ type: 'text', content: remainingText })
    }
  }

  // If no JSON found, return original content as text
  if (parts.length === 0) {
    return [{ type: 'text', content }]
  }

  return parts
}

// Memoized to prevent re-renders when other messages are added
export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  // Parse content for JSON blocks (only for assistant messages)
  const contentParts = useMemo(() => {
    if (isUser) {
      return [{ type: 'text' as const, content: message.content }]
    }
    return parseContentForJson(message.content)
  }, [message.content, isUser])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-primary' : 'bg-secondary'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-primary-foreground" />
        ) : (
          <Bot className="w-4 h-4 text-secondary-foreground" />
        )}
      </div>

      <div
        className={cn(
          'group relative max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-md'
            : 'bg-secondary text-secondary-foreground rounded-tl-md'
        )}
      >
        <div className="text-sm">
          {contentParts.map((part, index) => (
            part.type === 'json' ? (
              <CodeBlock key={index} code={part.content} language="json" />
            ) : (
              <div key={index} className="whitespace-pre-wrap break-words">
                {part.content}
              </div>
            )
          ))}
        </div>

        {/* Feedback buttons for assistant messages */}
        {!isUser && <MessageFeedback messageId={message.id} />}

        {!isUser && (
          <button
            onClick={handleCopy}
            className="absolute -right-8 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-secondary rounded"
            title="Copy message"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-green-600" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>
    </div>
  )
})
