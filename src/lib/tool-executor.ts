/**
 * Tool Executor - Parses and executes AI tool calls
 */

import {
  createWorkflow,
  duplicateWorkflow,
  deleteWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  updateNode,
  addNode,
  deleteNode,
  type ActionResult,
} from './n8n-actions'
import { TOOLS_REQUIRING_CONFIRMATION, TOOL_DESCRIPTIONS } from './n8n-tools'

// Parsed tool call from AI response
export interface ToolCall {
  id: string
  function: {
    name: string
    arguments: string // JSON string
  }
}

// Result of tool execution
export interface ToolExecutionResult {
  toolCallId: string
  toolName: string
  success: boolean
  result?: unknown
  error?: string
  userCancelled?: boolean
}

// Action preview for confirmation UI
export interface ActionPreview {
  toolName: string
  description: string
  icon: string
  args: Record<string, unknown>
  requiresConfirmation: boolean
  confirmMessage: string
}

/**
 * Parse a tool call and create an action preview
 */
export function parseToolCall(toolCall: ToolCall): ActionPreview {
  const { name } = toolCall.function
  let args: Record<string, unknown> = {}

  try {
    args = JSON.parse(toolCall.function.arguments)
  } catch (e) {
    console.error('[tool-executor] Failed to parse tool arguments:', e)
  }

  const toolInfo = TOOL_DESCRIPTIONS[name] || {
    action: name,
    icon: '🔧',
    confirmMessage: () => `Execute ${name}`,
  }

  return {
    toolName: name,
    description: toolInfo.action,
    icon: toolInfo.icon,
    args,
    requiresConfirmation: TOOLS_REQUIRING_CONFIRMATION.has(name), // ALL tools require confirmation
    confirmMessage: toolInfo.confirmMessage(args),
  }
}

/**
 * Execute a tool call
 * @param toolCall The tool call from the AI
 * @param onConfirm Callback to get user confirmation for destructive actions
 * @returns Result of the execution
 */
export async function executeToolCall(
  toolCall: ToolCall,
  onConfirm?: (preview: ActionPreview) => Promise<boolean>
): Promise<ToolExecutionResult> {
  const preview = parseToolCall(toolCall)
  console.log('[tool-executor] Executing tool:', preview.toolName, preview.args)

  // Check if confirmation is needed
  if (preview.requiresConfirmation && onConfirm) {
    const confirmed = await onConfirm(preview)
    if (!confirmed) {
      return {
        toolCallId: toolCall.id,
        toolName: preview.toolName,
        success: false,
        userCancelled: true,
        error: 'Action cancelled by user',
      }
    }
  }

  // Execute the tool
  try {
    let result: ActionResult

    switch (preview.toolName) {
      case 'duplicate_workflow':
        result = await duplicateWorkflow(
          preview.args.workflow_id as string,
          preview.args.new_name as string
        )
        break

      case 'create_workflow':
        result = await createWorkflow({
          name: preview.args.name as string,
        })
        break

      case 'activate_workflow':
        result = await activateWorkflow(preview.args.workflow_id as string)
        break

      case 'deactivate_workflow':
        result = await deactivateWorkflow(preview.args.workflow_id as string)
        break

      case 'update_node':
        result = await updateNode(
          preview.args.workflow_id as string,
          preview.args.node_name as string,
          preview.args.parameters as Record<string, unknown>
        )
        break

      case 'add_node':
        result = await addNode(
          preview.args.workflow_id as string,
          {
            name: preview.args.node_name as string,
            type: preview.args.node_type as string,
            parameters: preview.args.parameters as Record<string, unknown> | undefined,
            position: preview.args.position as [number, number] | undefined,
          },
          preview.args.connect_from as string | undefined
        )
        break

      case 'delete_node':
        result = await deleteNode(
          preview.args.workflow_id as string,
          preview.args.node_name as string
        )
        break

      case 'delete_workflow':
        result = await deleteWorkflow(preview.args.workflow_id as string)
        break

      default:
        return {
          toolCallId: toolCall.id,
          toolName: preview.toolName,
          success: false,
          error: `Unknown tool: ${preview.toolName}`,
        }
    }

    return {
      toolCallId: toolCall.id,
      toolName: preview.toolName,
      success: result.success,
      result: result.data,
      error: result.error,
    }
  } catch (error) {
    console.error('[tool-executor] Error executing tool:', error)
    return {
      toolCallId: toolCall.id,
      toolName: preview.toolName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Execute multiple tool calls
 */
export async function executeToolCalls(
  toolCalls: ToolCall[],
  onConfirm?: (preview: ActionPreview) => Promise<boolean>
): Promise<ToolExecutionResult[]> {
  const results: ToolExecutionResult[] = []

  for (const toolCall of toolCalls) {
    const result = await executeToolCall(toolCall, onConfirm)
    results.push(result)

    // Stop executing if user cancels
    if (result.userCancelled) {
      break
    }
  }

  return results
}

/**
 * Format tool results for sending back to the AI
 */
export function formatToolResultsForAI(results: ToolExecutionResult[]): string {
  return results
    .map((r) => {
      if (r.userCancelled) {
        return `Tool ${r.toolName}: Cancelled by user`
      }
      if (r.success) {
        return `Tool ${r.toolName}: Success${r.result ? ` - ${JSON.stringify(r.result)}` : ''}`
      }
      return `Tool ${r.toolName}: Failed - ${r.error}`
    })
    .join('\n')
}
