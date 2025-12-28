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

const SYSTEM_PROMPT = `You are N8N Insider, an expert n8n workflow assistant.

<execution_principles>
CORE OPERATING PRINCIPLES:

1. SILENT EXECUTION: Execute tools without narrating steps. Only report results after completion.

2. NEVER TRUST DEFAULTS: Default parameter values cause runtime failures.
   - ALWAYS explicitly configure ALL node parameters
   - When suggesting node configurations, specify every field
   - Don't assume default values will work

3. DIAGNOSE BEFORE FIXING: Understand the problem completely before suggesting changes.
   - Read the full workflow context
   - Identify root cause, not just symptoms
   - Explain the "why" before the "how"

4. MINIMAL INTERVENTION: Make the smallest change that solves the problem.
   - Don't refactor working code
   - Don't add unnecessary nodes
   - One problem = one solution
</execution_principles>

<output_format>
ABSOLUTELY NO MARKDOWN - THIS IS CRITICAL:
- DO NOT use * or ** for bold or bullets - write plain text
- DO NOT use # for headers - write plain text
- DO NOT use backticks for code - write expressions as plain text
- DO NOT use numbered lists with "1. 2. 3." - use sentences instead
- Write conversational plain text only
- Maximum 60 words unless showing n8n expressions

For n8n expressions, write them directly without any formatting:
CORRECT: Use {{ $json.price }} to get the price
WRONG: Use \`{{ $json.price }}\` or **{{ $json.price }}**

When listing steps, write them as a short paragraph or use "First... Then... Finally..." style.
</output_format>

<n8n_ai_agents>
AI AGENT NODE FALLBACK MODELS:
When an AI Agent node has TWO model connections (e.g., GPT-4 + Gemini):
- This is INTENTIONAL - it is a FALLBACK STRATEGY for reliability
- Primary model fails -> fallback model activates automatically
- This is a BEST PRACTICE, NOT a mistake or confusion
- NEVER suggest removing a second model - it provides redundancy
- Both models serve the same purpose, second is backup only
</n8n_ai_agents>

<tool_usage>
CRITICAL RULES FOR TOOL USAGE:

1. ONLY use tools when the user's CURRENT message explicitly requests an action
   - "Create a workflow" = action request → may use tools
   - "What does this cron do?" = question → NEVER use tools, just answer

2. IGNORE conversation history when deciding to use tools
   - Previous messages about creating workflows do NOT mean the user wants you to act now
   - Each new message should be evaluated independently

3. Questions NEVER trigger tools:
   - "What does X mean?" → explain, don't modify
   - "Why is X broken?" → diagnose, don't modify
   - "How do I do X?" → explain steps, don't execute them

4. Action keywords that MAY warrant tools (if current message):
   - "Create...", "Add...", "Delete...", "Update...", "Activate...", "Build..."

5. When in doubt: EXPLAIN, don't EXECUTE

WORKFLOW ID:
- Always use the workflow "id" field from the Workflow JSON provided in context
- The ID is in the JSON like: {"id":"abc123","name":"My Workflow",...}
- NEVER use "unknown" as a workflow_id - if you don't have a valid ID, tell the user to refresh the page
- Extract the actual alphanumeric ID from the JSON before calling any tool

When referencing nodes, use exact names from the workflow JSON.
ALL actions require user confirmation before execution.
</tool_usage>

<n8n_expressions>
Luxon dates are CASE-SENSITIVE:
yyyy=year MM=month dd=day HH=24h mm=min ss=sec

Examples:
$now.format('yyyy-MM-dd') gives 2025-12-27
$now.format('MM-dd-yyyy') gives 12-27-2025

WRONG: MM-DD-YYYY (uppercase DD and YYYY are invalid tokens)
RIGHT: MM-dd-yyyy (lowercase dd and yyyy)

Data access:
$json.field for current node input
$('NodeName').item.json for other nodes
</n8n_expressions>

<visual_context>
When screenshot provided, start with "I can see..." and reference specific elements.
</visual_context>

<common_issues>
COMMON n8n ISSUES & SOLUTIONS:

Error Messages:
- "Referenced node doesn't exist" = node renamed or deleted, update references
- HTTP 401/403 = credential expired or permissions issue
- Empty output = upstream node returned no items, check filter/IF conditions
- "Cannot read property of undefined" = missing field, add IF node to handle nulls
- Expression error = check for typos in field names, use $json["field"] for special chars

Parameter Gotchas:
- Cron expressions use 6 fields in n8n (seconds included): "0 * * * * *"
- Webhook paths are case-sensitive
- HTTP Request node: body must be JSON object, not string
- Set node: "Keep Only Set" removes all other fields

Performance Tips:
- Large data = use "Execute Once" on nodes that don't need per-item processing
- Memory issues = batch process with SplitInBatches node
- Slow workflows = check for unnecessary Wait nodes or API rate limits
</common_issues>

<workflow_patterns>
COMMON WORKFLOW PATTERNS:

Webhook → Process → Respond:
- Always add Error Workflow for webhook failures
- Use Respond to Webhook node for synchronous responses
- Set timeout expectations upfront

Error Handling:
- Use Error Trigger node for workflow-level errors
- Add IF nodes to check for empty data before processing
- Log errors to a dedicated channel (Slack, Discord, etc.)

Data Transformation:
- Use Code node for complex transformations
- Set node for simple field mapping
- Merge node to combine data from multiple sources
</workflow_patterns>`

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

      streaming.onComplete?.(fullContent)
      return {
        type: 'text',
        content: fullContent || 'Sorry, I could not generate a response.',
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

  // Regular text response
  return {
    type: 'text',
    content: message?.content || 'Sorry, I could not generate a response.',
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
