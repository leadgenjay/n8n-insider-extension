import { useSettingsStore } from '@/stores/settingsStore'
import type { Message } from '@/lib/supabase'
import { N8N_TOOLS } from './n8n-tools'
import type { ToolCall } from './tool-executor'

// Re-export ToolCall for consumers
export type { ToolCall }

// Content can be a string or multimodal array for vision models
export type MessageContent = string | Array<
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }
>

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: MessageContent
  tool_calls?: ToolCall[]
  tool_call_id?: string
}

// Response from AI - can be text or tool calls
export interface ChatResponse {
  type: 'text' | 'tool_calls'
  content?: string
  toolCalls?: ToolCall[]
}

// Streaming options for real-time token updates
export interface StreamingOptions {
  onToken?: (token: string) => void
  onComplete?: (fullContent: string) => void
  onError?: (error: Error) => void
}

export interface ChatCompletionResponse {
  id: string
  choices: Array<{
    message: {
      role: 'assistant'
      content: string | null
      tool_calls?: ToolCall[]
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Strip markdown formatting from AI responses (defense-in-depth)
 * Even if the AI ignores instructions, this ensures plain text output
 */
function stripMarkdown(text: string): string {
  return text
    // Remove bold/italic: **text** or *text* or __text__ or _text_
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove headers: # Header or ## Header etc
    .replace(/^#{1,6}\s+/gm, '')
    // Remove inline code: `code`
    .replace(/`([^`]+)`/g, '$1')
    // Remove code blocks: ```code```
    .replace(/```[\s\S]*?```/g, (match) => {
      // Extract just the code content without the backticks
      return match.replace(/```\w*\n?/g, '').replace(/```/g, '').trim()
    })
    // Remove bullet points at start of lines: - item or * item
    .replace(/^[\s]*[-*]\s+/gm, '')
    // Remove numbered lists: 1. item or 1) item
    .replace(/^[\s]*\d+[.)]\s+/gm, '')
    // Clean up multiple newlines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Detect if a message is likely a question (should NOT trigger tools)
 * This is a safeguard to prevent AI from executing actions when user asks questions
 */
function isLikelyQuestion(message: string): boolean {
  const trimmed = message.trim()
  // Check if message ends with question mark
  if (trimmed.endsWith('?')) return true
  // Check if message starts with common question words
  const questionPatterns = /^(what|why|how|when|where|who|which|can you explain|does|is|are|do|could you|would you|tell me|explain)\b/i
  return questionPatterns.test(trimmed)
}

const SYSTEM_PROMPT = `You are N8N Insider, an expert n8n workflow assistant who speaks in brief, conversational plain text.

<response_format>
CRITICAL FORMAT RULES - FOLLOW EXACTLY:

Write SHORT conversational responses in plain text only. Keep answers under 60 words unless showing n8n expressions. Write naturally as if speaking to a colleague, not writing documentation.

Never use asterisks, hashtags, backticks, or any markdown symbols. Write n8n expressions directly like this: Use {{ $json.price }} to get the price value.

When explaining multiple steps, use natural flow: "First do X, then Y, and finally Z" rather than numbered or bulleted lists.
</response_format>

<execution_principles>
Work silently, executing tools without narrating each step, and report only the final result. Always configure every node parameter explicitly since defaults often cause failures. Before suggesting fixes, diagnose the root cause by reading the full workflow context. Make minimal changes: one problem deserves one targeted solution, not a refactor.
</execution_principles>

<ai_agent_nodes>
When you see an AI Agent node with two model connections such as GPT-4 plus Gemini, this is intentional. The second model is a fallback for reliability. Never suggest removing the backup model since redundancy is a best practice.
</ai_agent_nodes>

<tool_usage>
Only use tools when the current message explicitly requests an action like "create", "add", "delete", or "update". Questions never trigger tools. If someone asks "what does this do?" or "why is this broken?", explain without modifying anything. When in doubt, explain rather than execute. Always extract the actual workflow ID from the provided JSON before any tool call, never use "unknown" as an ID. All actions require user confirmation before execution.
</tool_usage>

<n8n_expressions>
Luxon date tokens are case-sensitive. Use lowercase for day and year: yyyy for year, MM for month, dd for day, HH for 24-hour, mm for minutes, ss for seconds. Example: $now.format('yyyy-MM-dd') produces 2025-12-27. Using uppercase DD or YYYY causes errors.

Access data with $json.field for current node or $('NodeName').item.json for other nodes.
</n8n_expressions>

<visual_context>
When a screenshot is provided, begin with "I can see..." and reference specific visible elements.
</visual_context>

<common_issues>
The error "Referenced node doesn't exist" means a node was renamed or deleted, so update the reference. HTTP 401 or 403 indicates expired credentials or permission issues. Empty output means the upstream node returned no items, check your filter or IF conditions. "Cannot read property of undefined" means a field is missing, add an IF node to handle nulls.

For cron expressions, n8n uses 6 fields including seconds: "0 * * * * *" fires every minute. Webhook paths are case-sensitive. HTTP Request body must be a JSON object not a string. The Set node with "Keep Only Set" enabled removes all other fields.

For large data, use "Execute Once" on nodes that process once per batch. For memory issues, use SplitInBatches. For slow workflows, check for Wait nodes or rate limits.
</common_issues>

<workflow_patterns>
For webhook workflows, add an Error Workflow for failure handling and use Respond to Webhook for synchronous responses. For error handling, use the Error Trigger node and add IF nodes before processing to check for empty data. For transformations, use Code node for complex logic, Set node for simple mapping, and Merge node to combine sources.
</workflow_patterns>

REMEMBER: Brief plain text only, under 60 words, no markdown symbols.`

export async function sendChatMessage(
  messages: Message[],
  userMessage: string,
  context?: {
    screenshot?: string
    workflowData?: Record<string, unknown>
    currentUrl?: string
  },
  streaming?: StreamingOptions
): Promise<ChatResponse> {
  const { openRouterApiKey, selectedModel, n8nConnected, assistantMode } = useSettingsStore.getState()

  if (!openRouterApiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  // Build message history
  const chatMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
  ]

  // Add conversation history (last 20 messages for context)
  const recentMessages = messages.slice(-20)
  for (const msg of recentMessages) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      chatMessages.push({
        role: msg.role,
        content: msg.content,
      })
    }
  }

  // Build the user message with context
  let textContent = userMessage

  if (context?.workflowData) {
    const workflow = context.workflowData as { id?: string; name?: string; nodes?: unknown[] }
    const nodeCount = Array.isArray(workflow.nodes) ? workflow.nodes.length : 0
    // Add context header before user message for AI awareness
    // Only include ID if we have a valid one (not empty/undefined)
    const idPart = workflow.id ? ` | ID: ${workflow.id}` : ' | ID: NOT_AVAILABLE (cannot use tools)'
    textContent = `[Workflow: "${workflow.name || 'Untitled'}"${idPart} | Nodes: ${nodeCount}]\n\n${userMessage}`
    // Minified JSON for smaller payload (30-40% reduction)
    textContent += `\n\nWorkflow JSON:\n${JSON.stringify(context.workflowData)}`
  }

  if (context?.currentUrl) {
    textContent += `\n\nCurrent URL: ${context.currentUrl}`
  }

  // If we have a screenshot, use multimodal format
  if (context?.screenshot) {
    console.log('[n8n-copilot] Sending message WITH screenshot')
    const multimodalContent: MessageContent = [
      { type: 'text', text: textContent },
      {
        type: 'image_url',
        image_url: {
          url: context.screenshot.startsWith('data:')
            ? context.screenshot
            : `data:image/png;base64,${context.screenshot}`
        }
      },
    ]
    chatMessages.push({ role: 'user', content: multimodalContent })
  } else {
    console.log('[n8n-copilot] Sending message WITHOUT screenshot')
    chatMessages.push({ role: 'user', content: textContent })
  }

  console.log('[n8n-copilot] Sending to model:', selectedModel)
  console.log('[n8n-copilot] Message count:', chatMessages.length)

  // Build request body - include tools when n8n is connected
  const requestBody: Record<string, unknown> = {
    model: selectedModel,
    messages: chatMessages,
    max_tokens: 4096,
    temperature: 0.4,
  }

  // Add tools when n8n is connected AND in builder mode AND message is NOT a question
  // In helper mode, AI only gives suggestions without executing actions
  // Questions should NEVER trigger tool calls - this is a critical safeguard
  const messageIsQuestion = isLikelyQuestion(userMessage)
  const shouldIncludeTools = n8nConnected && assistantMode === 'builder' && !messageIsQuestion

  // Note: Streaming is disabled when tools are enabled (OpenRouter limitation)
  const useStreaming = streaming?.onToken && !shouldIncludeTools

  if (shouldIncludeTools) {
    requestBody.tools = N8N_TOOLS
    requestBody.tool_choice = 'auto'
    console.log('[n8n-copilot] Including', N8N_TOOLS.length, 'tools in request (builder mode, action detected)')
  } else if (messageIsQuestion) {
    console.log('[n8n-copilot] Question detected - NOT including tools (will answer only)')
  } else if (assistantMode === 'helper') {
    console.log('[n8n-copilot] Helper mode - AI will give suggestions only')
  }

  // Enable streaming for faster first-token response
  if (useStreaming) {
    requestBody.stream = true
    console.log('[n8n-copilot] Streaming enabled for faster response')
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': chrome.runtime.getURL(''),
      'X-Title': 'N8N Insider',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `API error: ${response.status}`)
  }

  // Handle streaming response
  if (useStreaming && response.body) {
    let fullContent = ''
    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim() !== '')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                fullContent += delta
                streaming.onToken?.(delta)
              }
            } catch {
              // Skip invalid JSON chunks
            }
          }
        }
      }

      const cleanContent = stripMarkdown(fullContent)
      streaming.onComplete?.(cleanContent)
      return {
        type: 'text',
        content: cleanContent || 'Sorry, I could not generate a response.',
      }
    } catch (error) {
      streaming.onError?.(error instanceof Error ? error : new Error('Streaming error'))
      throw error
    }
  }

  // Non-streaming response handling
  const data: ChatCompletionResponse = await response.json()
  const message = data.choices?.[0]?.message

  // Check if AI wants to call tools
  if (message?.tool_calls && message.tool_calls.length > 0) {
    console.log('[n8n-copilot] AI requested tool calls:', message.tool_calls.map(t => t.function.name))
    return {
      type: 'tool_calls',
      toolCalls: message.tool_calls,
    }
  }

  // Regular text response - strip any markdown the AI may have produced
  return {
    type: 'text',
    content: stripMarkdown(message?.content || '') || 'Sorry, I could not generate a response.',
  }
}

export async function generateWorkflowFix(
  workflowJson: Record<string, unknown>,
  issue: string
): Promise<{ suggestion: string; modifiedWorkflow?: Record<string, unknown> }> {
  const { openRouterApiKey, selectedModel } = useSettingsStore.getState()

  if (!openRouterApiKey) {
    throw new Error('OpenRouter API key not configured')
  }

  const prompt = `Analyze this workflow and suggest a fix for the described issue.

Issue: ${issue}

Current Workflow:
${JSON.stringify(workflowJson, null, 2)}

Respond in this exact format:

PROBLEM:
[One paragraph explaining what is wrong]

FIX:
[Numbered steps to resolve the issue]

MODIFIED WORKFLOW (if applicable):
[The corrected workflow JSON, or "No JSON changes needed" if the fix is procedural]`

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': chrome.runtime.getURL(''),
      'X-Title': 'N8N Insider',
    },
    body: JSON.stringify({
      model: selectedModel,
      messages: [
        { role: 'system', content: 'You are an expert n8n workflow automation engineer. Provide precise, actionable fixes.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 8192,
      temperature: 0.3, // Lower temperature for more precise fixes
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
    throw new Error(error.error?.message || `API error: ${response.status}`)
  }

  const data: ChatCompletionResponse = await response.json()
  const suggestion = data.choices?.[0]?.message?.content || 'Could not generate fix suggestion.'

  // Try to extract modified workflow JSON from response
  let modifiedWorkflow: Record<string, unknown> | undefined
  // Look for JSON after "MODIFIED WORKFLOW" section (handles both with and without backticks)
  const jsonMatch = suggestion.match(/MODIFIED WORKFLOW[^:]*:\s*\n?\s*(\{[\s\S]*\})/i) ||
                    suggestion.match(/```json\n([\s\S]*?)\n```/)
  if (jsonMatch) {
    try {
      modifiedWorkflow = JSON.parse(jsonMatch[1])
    } catch {
      // JSON parsing failed, that's okay
    }
  }

  return { suggestion, modifiedWorkflow }
}

/**
 * Generate a short title for a conversation based on the messages
 */
export async function generateConversationTitle(
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  const { openRouterApiKey } = useSettingsStore.getState()

  if (!openRouterApiKey) {
    return 'New Conversation'
  }

  try {
    // Use a fast, cheap model for title generation
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': chrome.runtime.getURL(''),
        'X-Title': 'N8N Insider',
      },
      body: JSON.stringify({
        model: 'google/gemini-flash-1.5', // Fast and cheap for simple task
        messages: [
          {
            role: 'system',
            content: 'Generate a short title (3-6 words) for this n8n workflow conversation. Just return the title, nothing else. No quotes, no punctuation at the end.',
          },
          {
            role: 'user',
            content: messages.map(m => `${m.role}: ${m.content.slice(0, 200)}`).join('\n'),
          },
        ],
        max_tokens: 20,
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      console.error('[n8n-copilot] Failed to generate title:', response.status)
      return 'New Conversation'
    }

    const data = await response.json()
    const title = data.choices?.[0]?.message?.content?.trim() || 'New Conversation'

    // Clean up the title - remove quotes and limit length
    return title.replace(/^["']|["']$/g, '').slice(0, 50)
  } catch (error) {
    console.error('[n8n-copilot] Error generating title:', error)
    return 'New Conversation'
  }
}
