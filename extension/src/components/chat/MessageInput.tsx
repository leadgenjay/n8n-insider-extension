import { useState, useRef, useEffect } from 'react'
import { Send, Camera, Loader2, Workflow, AlertTriangle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chatStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useContextCacheStore } from '@/stores/contextCacheStore'
import { useAuthStore } from '@/stores/authStore'
import { useUsageStore } from '@/stores/usageStore'
import { sendChatMessage, type ChatResponse, type StreamingOptions } from '@/lib/openrouter'
import { captureContext, captureScreenshot, fetchWorkflowFromN8n } from '@/lib/context-capture'
import { executeToolCalls, parseToolCall, type ActionPreview, type ToolCall } from '@/lib/tool-executor'
import { ActionConfirmation } from './ActionConfirmation'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/supabase'

// Stripe Payment Link
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/6oU14mcrU7QF4Ev3gK4ko0w'

// Check if user has Pro access (lifetime, active subscription, or canceled with grace period)
function isPro(profile: Profile | null): boolean {
  if (!profile) return false

  // Lifetime users always have access
  if (profile.is_lifetime) return true

  // Active subscription
  if (profile.subscription_status === 'active') return true

  // Canceled but still in billing period (grace period)
  if (profile.subscription_status === 'canceled' && profile.subscription_end_date) {
    return new Date(profile.subscription_end_date) > new Date()
  }

  return false
}

// Timeout for screenshot capture (prevents UI blocking)
const SCREENSHOT_TIMEOUT_MS = 2000

// State for pending action confirmation
interface PendingAction {
  toolCall: ToolCall
  preview: ActionPreview
}

export function MessageInput() {
  const [input, setInput] = useState('')
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedContext, setCapturedContext] = useState<{
    screenshot?: string
    workflowData?: Record<string, unknown>
    currentUrl?: string
  } | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [isExecutingAction, setIsExecutingAction] = useState(false)
  const [usageBlocked, setUsageBlocked] = useState(false)
  // Streaming state - content accumulated for future UI display
  const [, setStreamingContent] = useState('')
  const [, setIsStreaming] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { messages, addMessage, sending, generateAndSetTitle } = useChatStore()
  const { openRouterConnected, n8nConnected } = useSettingsStore()
  const { setCachedContext } = useContextCacheStore()
  const { profile } = useAuthStore()
  const { checkAndIncrementUsage, resetIfNewDay } = useUsageStore()

  // Check for new day on mount
  useEffect(() => {
    resetIfNewDay()
  }, [resetIfNewDay])

  const canSend = input.trim() && !sending && openRouterConnected && !pendingAction && !usageBlocked

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSubmit = async () => {
    if (!canSend) return

    // Check usage limit for free users
    if (!isPro(profile)) {
      const usage = await checkAndIncrementUsage()
      if (!usage.allowed) {
        setUsageBlocked(true)
        return
      }
    }

    const userMessage = input.trim()
    setInput('')

    // AUTO-CAPTURE: Use manually captured context if available, otherwise auto-capture
    let context = capturedContext
    setCapturedContext(null)

    if (!context) {
      // Auto-capture context before sending - PARALLELIZED with timeout
      try {
        setIsCapturing(true)
        console.log('[n8n-copilot] Starting parallel auto-capture...')

        // Capture page context and screenshot in parallel with timeout
        const [pageContext, screenshot] = await Promise.all([
          captureContext(),
          // Screenshot with timeout to prevent UI blocking
          Promise.race([
            captureScreenshot(),
            new Promise<string | null>(resolve =>
              setTimeout(() => {
                console.log('[n8n-copilot] Screenshot capture timed out')
                resolve(null)
              }, SCREENSHOT_TIMEOUT_MS)
            )
          ])
        ])

        console.log('[n8n-copilot] Parallel capture complete:', {
          hasPageContext: !!pageContext,
          hasScreenshot: !!screenshot
        })

        let workflowData: Record<string, unknown> | undefined

        // Fetch full workflow via API if connected (can run after initial context)
        if (pageContext.workflowId && n8nConnected) {
          console.log('[n8n-copilot] Fetching workflow from n8n API...')
          const workflow = await fetchWorkflowFromN8n(pageContext.workflowId)
          if (workflow) {
            workflowData = workflow as unknown as Record<string, unknown>
            console.log('[n8n-copilot] Workflow fetched')
          }
        } else if (pageContext.nodes && pageContext.nodes.length > 0) {
          // Use page-extracted data as fallback
          workflowData = {
            workflowId: pageContext.workflowId,
            workflowName: pageContext.workflowName,
            nodes: pageContext.nodes,
          }
        }

        context = {
          screenshot: screenshot || undefined,
          workflowData,
          currentUrl: pageContext.currentUrl,
        }

        console.log('[n8n-copilot] Final context:', {
          hasScreenshot: !!context.screenshot,
          hasWorkflowData: !!context.workflowData,
          currentUrl: context.currentUrl,
        })

        // Cache the context for future reference
        if (context.workflowData || context.screenshot) {
          setCachedContext({
            ...context,
            workflowId: pageContext.workflowId,
            capturedAt: Date.now(),
          })
        }
      } catch (error) {
        console.error('[n8n-copilot] Auto-capture failed:', error)
        // Continue without context if auto-capture fails
      } finally {
        setIsCapturing(false)
      }
    }

    try {
      // Add user message to chat
      await addMessage('user', userMessage, context ? { hasContext: true } : undefined)

      // Create placeholder for streaming response
      setStreamingContent('')
      setIsStreaming(true)

      // Streaming callbacks for real-time token updates
      const streamingOptions: StreamingOptions = {
        onToken: (token) => {
          setStreamingContent(prev => prev + token)
        },
        onComplete: () => {
          setIsStreaming(false)
          setStreamingContent('')
        },
        onError: (error) => {
          setIsStreaming(false)
          setStreamingContent('')
          console.error('[n8n-copilot] Streaming error:', error)
        }
      }

      // Get AI response with streaming enabled
      const response = await sendChatMessage(messages, userMessage, context || undefined, streamingOptions)

      // Handle the response based on type
      await handleChatResponse(response)
    } catch (error) {
      console.error('Error sending message:', error)
      setIsStreaming(false)
      setStreamingContent('')
      await addMessage('assistant', `Sorry, there was an error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Handle AI response - text or tool calls
  const handleChatResponse = async (response: ChatResponse) => {
    if (response.type === 'text') {
      // Regular text response
      await addMessage('assistant', response.content || '')
      // Try to generate a title after AI responds (if conversation is still "New Conversation")
      generateAndSetTitle()
      return
    }

    // Handle tool calls
    if (response.type === 'tool_calls' && response.toolCalls) {
      console.log('[n8n-copilot] Processing tool calls:', response.toolCalls)

      for (const toolCall of response.toolCalls) {
        const preview = parseToolCall(toolCall)

        // ALL actions require confirmation - show confirmation UI
        // This prevents AI from executing any action without user approval
        if (preview.requiresConfirmation) {
          setPendingAction({ toolCall, preview })
          return // Wait for user confirmation
        }

        // Fallback for any unknown tools (shouldn't happen, but handle gracefully)
        await addMessage('assistant', `${preview.icon} Executing: ${preview.confirmMessage}`)
        await executeAndReportTool(toolCall, preview)
      }
    }
  }

  // Execute a tool and report the result
  const executeAndReportTool = async (toolCall: ToolCall, preview: ActionPreview) => {
    setIsExecutingAction(true)
    try {
      const results = await executeToolCalls([toolCall])
      const result = results[0]

      if (result.success) {
        // Don't dump JSON - just confirm success with a hint to refresh
        await addMessage('assistant', `Done! ${preview.description} completed successfully. Refresh the n8n page to see the changes.`)
      } else {
        await addMessage('assistant', `${preview.description} failed: ${result.error}`)
      }
    } catch (error) {
      console.error('[n8n-copilot] Tool execution error:', error)
      await addMessage('assistant', `Error executing ${preview.toolName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExecutingAction(false)
    }
  }

  // Handle confirmation of pending action
  const handleConfirmAction = async () => {
    if (!pendingAction) return

    setIsExecutingAction(true)
    try {
      await executeAndReportTool(pendingAction.toolCall, pendingAction.preview)
    } finally {
      setPendingAction(null)
      setIsExecutingAction(false)
    }
  }

  // Handle cancellation of pending action
  const handleCancelAction = async () => {
    if (!pendingAction) return

    await addMessage('assistant', `Action cancelled: ${pendingAction.preview.description}`)
    setPendingAction(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleCaptureContext = async () => {
    setIsCapturing(true)
    try {
      const pageContext = await captureContext()
      const screenshot = await captureScreenshot()

      let workflowData: Record<string, unknown> | undefined

      // If we found a workflow ID and n8n is connected, fetch the full workflow
      if (pageContext.workflowId && n8nConnected) {
        const workflow = await fetchWorkflowFromN8n(pageContext.workflowId)
        if (workflow) {
          workflowData = workflow as unknown as Record<string, unknown>
        }
      } else if (pageContext.nodes && pageContext.nodes.length > 0) {
        // Use page-extracted data as fallback
        workflowData = {
          workflowId: pageContext.workflowId,
          workflowName: pageContext.workflowName,
          nodes: pageContext.nodes,
        }
      }

      setCapturedContext({
        screenshot: screenshot || undefined,
        workflowData,
        currentUrl: pageContext.currentUrl,
      })
    } catch (error) {
      console.error('Error capturing context:', error)
    } finally {
      setIsCapturing(false)
    }
  }

  const clearContext = () => {
    setCapturedContext(null)
  }

  return (
    <div className="border-t border-border bg-white p-4">
      {!openRouterConnected && (
        <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-700">
            Configure your OpenRouter API key in Settings to start chatting
          </p>
        </div>
      )}

      {/* Daily limit reached message */}
      {usageBlocked && (
        <div className="mb-3 px-3 py-3 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-primary">Daily limit reached</p>
              <p className="text-xs text-muted-foreground mt-1">
                You have used your 50 free requests for today.
              </p>
              <a
                href={`${STRIPE_PAYMENT_LINK}?client_reference_id=${profile?.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Upgrade to Pro - $10/mo
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation UI */}
      {pendingAction && (
        <div className="mb-3">
          <ActionConfirmation
            preview={pendingAction.preview}
            onConfirm={handleConfirmAction}
            onCancel={handleCancelAction}
            isExecuting={isExecutingAction}
          />
        </div>
      )}

      {capturedContext && (
        <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-700">
                {capturedContext.workflowData
                  ? `Workflow context attached${capturedContext.screenshot ? ' + screenshot' : ''}`
                  : capturedContext.screenshot
                    ? 'Screenshot attached'
                    : 'Page context attached'
                }
              </span>
            </div>
            <button
              onClick={clearContext}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCaptureContext}
          disabled={isCapturing}
          className={cn('flex-shrink-0', capturedContext && 'text-blue-600')}
          title="Capture workflow context"
        >
          {isCapturing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </Button>

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={openRouterConnected ? "Ask about your n8n workflow..." : "Configure API key to start..."}
            disabled={!openRouterConnected || sending}
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl border border-input bg-background px-4 py-3 pr-12 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
              'min-h-[44px] max-h-[120px]'
            )}
          />
        </div>

        <Button
          size="icon"
          onClick={handleSubmit}
          disabled={!canSend}
          className="flex-shrink-0"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
