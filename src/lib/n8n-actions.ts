/**
 * n8n API Actions - Functions for programmatically managing n8n workflows
 * Uses n8n REST API v1
 */

import { useSettingsStore } from '@/stores/settingsStore'
import type { N8nWorkflow } from './context-capture'

// Types for action results
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// Helper to get n8n API config
function getN8nConfig() {
  const { n8nInstanceUrl, n8nApiKey, n8nConnected } = useSettingsStore.getState()
  if (!n8nConnected || !n8nInstanceUrl || !n8nApiKey) {
    throw new Error('n8n not connected. Please configure your n8n instance in Settings.')
  }
  return { n8nInstanceUrl, n8nApiKey }
}

// Helper to sanitize a single node - only include fields n8n accepts
function sanitizeNode(node: any): any {
  const cleanNode: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    type: node.type,
    position: node.position,
    parameters: node.parameters || {},
  }

  // Include optional node fields if they exist
  if (node.typeVersion !== undefined) {
    cleanNode.typeVersion = node.typeVersion
  }
  if (node.credentials !== undefined) {
    cleanNode.credentials = node.credentials
  }
  if (node.disabled !== undefined) {
    cleanNode.disabled = node.disabled
  }
  if (node.notes !== undefined) {
    cleanNode.notes = node.notes
  }
  if (node.notesInFlow !== undefined) {
    cleanNode.notesInFlow = node.notesInFlow
  }
  if (node.webhookId !== undefined) {
    cleanNode.webhookId = node.webhookId
  }

  return cleanNode
}

// Helper to sanitize workflow objects before sending to n8n API
// WHITELIST approach: only include fields that n8n API accepts
function sanitizeWorkflowForUpdate(workflow: any): any {
  // Sanitize each node
  const cleanNodes = workflow.nodes?.map(sanitizeNode) || []

  // Only send fields that n8n PUT /workflows/{id} accepts
  const cleanWorkflow: Record<string, unknown> = {
    name: workflow.name,
    nodes: cleanNodes,
    connections: workflow.connections,
  }

  // Include optional fields only if they exist
  if (workflow.settings !== undefined) {
    cleanWorkflow.settings = workflow.settings
  }
  if (workflow.staticData !== undefined) {
    cleanWorkflow.staticData = workflow.staticData
  }
  // Note: Don't include 'active' - use activate/deactivate endpoints instead
  // Note: Don't include 'id' - it's in the URL path

  console.log('[n8n-actions] Sanitized workflow - nodes:', cleanNodes.length, 'fields:', Object.keys(cleanWorkflow))
  return cleanWorkflow
}

// Helper for API requests
async function n8nRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<ActionResult<T>> {
  try {
    const { n8nInstanceUrl, n8nApiKey } = getN8nConfig()

    // Log request details for debugging
    if (body && (method === 'PUT' || method === 'POST')) {
      console.log(`[n8n-actions] ${method} ${endpoint} - Request body keys:`, Object.keys(body as object))
    }

    const response = await fetch(`${n8nInstanceUrl}/api/v1${endpoint}`, {
      method,
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    // Check content type to detect HTML error pages
    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')

    if (!response.ok) {
      // Try to extract error message from response
      let errorMessage = `API error: ${response.status} ${response.statusText}`

      if (isJson) {
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || errorMessage
        } catch {
          // Failed to parse error JSON, use default message
        }
      } else {
        // Response is HTML or other non-JSON format
        const responseText = await response.text()
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
          errorMessage = `n8n API returned HTML instead of JSON. Check your n8n instance URL (${n8nInstanceUrl}) and API key. Status: ${response.status}`
        } else {
          errorMessage = `${errorMessage}. Response: ${responseText.substring(0, 200)}`
        }
      }

      throw new Error(errorMessage)
    }

    // DELETE returns 204 No Content
    if (response.status === 204) {
      return { success: true }
    }

    // Verify response is JSON before parsing
    if (!isJson) {
      const responseText = await response.text()
      throw new Error(`Expected JSON response but got ${contentType}. Response: ${responseText.substring(0, 200)}`)
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    console.error(`[n8n-actions] ${method} ${endpoint} failed:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create a new workflow
 */
export async function createWorkflow(
  workflow: Partial<N8nWorkflow> & { name: string }
): Promise<ActionResult<N8nWorkflow>> {
  console.log('[n8n-actions] Creating workflow:', workflow.name)

  const workflowData = {
    name: workflow.name,
    nodes: workflow.nodes || [],
    connections: workflow.connections || {},
    settings: workflow.settings || {},
  }

  return n8nRequest<N8nWorkflow>('/workflows', 'POST', workflowData)
}

/**
 * Update an existing workflow (full replacement - uses PUT)
 */
export async function updateWorkflow(
  workflowId: string,
  workflow: Partial<N8nWorkflow>
): Promise<ActionResult<N8nWorkflow>> {
  console.log('[n8n-actions] Updating workflow:', workflowId)

  // First fetch the current workflow to merge with updates
  const currentResult = await n8nRequest<N8nWorkflow>(`/workflows/${workflowId}`, 'GET')
  if (!currentResult.success || !currentResult.data) {
    return { success: false, error: currentResult.error || 'Failed to fetch current workflow' }
  }

  // Merge current workflow with updates
  const updatedWorkflow = {
    ...currentResult.data,
    ...workflow,
    // Ensure we don't accidentally change the ID
    id: workflowId,
  }

  // Remove read-only fields that n8n API doesn't accept in PUT requests
  const cleanedWorkflow = sanitizeWorkflowForUpdate(updatedWorkflow)

  return n8nRequest<N8nWorkflow>(`/workflows/${workflowId}`, 'PUT', cleanedWorkflow)
}

/**
 * Duplicate an existing workflow with a new name
 */
export async function duplicateWorkflow(
  workflowId: string,
  newName: string
): Promise<ActionResult<N8nWorkflow>> {
  console.log('[n8n-actions] Duplicating workflow:', workflowId, 'as:', newName)

  // Fetch the existing workflow
  const existingResult = await n8nRequest<N8nWorkflow>(`/workflows/${workflowId}`, 'GET')
  if (!existingResult.success || !existingResult.data) {
    return { success: false, error: existingResult.error || 'Failed to fetch workflow to duplicate' }
  }

  const existing = existingResult.data

  // Create a copy with new name (remove id so n8n generates a new one)
  const duplicateData = {
    name: newName,
    nodes: existing.nodes,
    connections: existing.connections,
    settings: existing.settings,
    // Don't include: id, active, createdAt, updatedAt
  }

  return n8nRequest<N8nWorkflow>('/workflows', 'POST', duplicateData)
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(workflowId: string): Promise<ActionResult<void>> {
  console.log('[n8n-actions] Deleting workflow:', workflowId)
  return n8nRequest<void>(`/workflows/${workflowId}`, 'DELETE')
}

/**
 * Activate a workflow
 */
export async function activateWorkflow(workflowId: string): Promise<ActionResult<N8nWorkflow>> {
  console.log('[n8n-actions] Activating workflow:', workflowId)
  return n8nRequest<N8nWorkflow>(`/workflows/${workflowId}/activate`, 'POST')
}

/**
 * Deactivate a workflow
 */
export async function deactivateWorkflow(workflowId: string): Promise<ActionResult<N8nWorkflow>> {
  console.log('[n8n-actions] Deactivating workflow:', workflowId)
  return n8nRequest<N8nWorkflow>(`/workflows/${workflowId}/deactivate`, 'POST')
}

/**
 * Get a workflow by ID
 */
export async function getWorkflow(workflowId: string): Promise<ActionResult<N8nWorkflow>> {
  console.log('[n8n-actions] Getting workflow:', workflowId)
  return n8nRequest<N8nWorkflow>(`/workflows/${workflowId}`, 'GET')
}

/**
 * List all workflows
 */
export async function listWorkflows(): Promise<ActionResult<N8nWorkflow[]>> {
  console.log('[n8n-actions] Listing workflows')
  const result = await n8nRequest<{ data: N8nWorkflow[] }>('/workflows', 'GET')
  if (result.success && result.data) {
    return { success: true, data: result.data.data || [] }
  }
  return { success: false, error: result.error }
}

/**
 * Update a specific node in a workflow
 */
export async function updateNode(
  workflowId: string,
  nodeName: string,
  nodeUpdates: Record<string, unknown>
): Promise<ActionResult<N8nWorkflow>> {
  console.log('[n8n-actions] Updating node:', nodeName, 'in workflow:', workflowId)

  // Fetch the current workflow
  const currentResult = await getWorkflow(workflowId)
  if (!currentResult.success || !currentResult.data) {
    return { success: false, error: currentResult.error || 'Failed to fetch workflow' }
  }

  const workflow = currentResult.data

  // Find and update the node
  const nodeIndex = workflow.nodes.findIndex((n) => n.name === nodeName)
  if (nodeIndex === -1) {
    return { success: false, error: `Node "${nodeName}" not found in workflow` }
  }

  // Merge node updates
  workflow.nodes[nodeIndex] = {
    ...workflow.nodes[nodeIndex],
    ...nodeUpdates,
    // Preserve node identity
    name: nodeName,
    id: workflow.nodes[nodeIndex].id,
  }

  // Save the updated workflow (sanitize to remove read-only fields)
  const cleanedWorkflow = sanitizeWorkflowForUpdate(workflow)
  return n8nRequest<N8nWorkflow>(`/workflows/${workflowId}`, 'PUT', cleanedWorkflow)
}

/**
 * Add a new node to a workflow
 */
export async function addNode(
  workflowId: string,
  node: {
    name: string
    type: string
    parameters?: Record<string, unknown>
    position?: [number, number]
  },
  connectFromNode?: string
): Promise<ActionResult<N8nWorkflow>> {
  console.log('[n8n-actions] Adding node:', node.name, 'to workflow:', workflowId)

  // Validate workflow ID
  if (!workflowId || workflowId === 'unknown' || workflowId === 'NOT_AVAILABLE') {
    return {
      success: false,
      error: 'Invalid workflow ID. Please refresh the n8n page and try again. Make sure you have a workflow open (not a new unsaved workflow).'
    }
  }

  // Fetch the current workflow
  const currentResult = await getWorkflow(workflowId)
  if (!currentResult.success || !currentResult.data) {
    return { success: false, error: currentResult.error || `Failed to fetch workflow with ID "${workflowId}". The workflow may not exist or you may not have access to it.` }
  }

  const workflow = currentResult.data

  // Check if node name already exists
  if (workflow.nodes.some((n) => n.name === node.name)) {
    return { success: false, error: `Node "${node.name}" already exists in workflow` }
  }

  // Generate a unique ID for the new node
  const newNodeId = `node_${Date.now()}`

  // Calculate position if not provided (place to the right of last node)
  let position = node.position
  if (!position && workflow.nodes.length > 0) {
    const lastNode = workflow.nodes[workflow.nodes.length - 1]
    position = [lastNode.position[0] + 200, lastNode.position[1]]
  }

  // Create the new node
  const newNode = {
    id: newNodeId,
    name: node.name,
    type: node.type,
    parameters: node.parameters || {},
    position: position || [250, 250],
    typeVersion: 1,
  }

  workflow.nodes.push(newNode)

  // Add connection if specified
  if (connectFromNode) {
    const existingConnection = workflow.connections[connectFromNode]
    if (!existingConnection) {
      workflow.connections[connectFromNode] = { main: [[{ node: node.name, type: 'main', index: 0 }]] }
    } else {
      if (!existingConnection.main[0]) {
        existingConnection.main[0] = []
      }
      existingConnection.main[0].push({
        node: node.name,
        type: 'main',
        index: 0,
      })
    }
  }

  // Save the updated workflow (sanitize to remove read-only fields)
  const cleanedWorkflow = sanitizeWorkflowForUpdate(workflow)
  return n8nRequest<N8nWorkflow>(`/workflows/${workflowId}`, 'PUT', cleanedWorkflow)
}

/**
 * Delete a node from a workflow
 */
export async function deleteNode(
  workflowId: string,
  nodeName: string
): Promise<ActionResult<N8nWorkflow>> {
  console.log('[n8n-actions] Deleting node:', nodeName, 'from workflow:', workflowId)

  // Fetch the current workflow
  const currentResult = await getWorkflow(workflowId)
  if (!currentResult.success || !currentResult.data) {
    return { success: false, error: currentResult.error || 'Failed to fetch workflow' }
  }

  const workflow = currentResult.data

  // Find and remove the node
  const nodeIndex = workflow.nodes.findIndex((n) => n.name === nodeName)
  if (nodeIndex === -1) {
    return { success: false, error: `Node "${nodeName}" not found in workflow` }
  }

  workflow.nodes.splice(nodeIndex, 1)

  // Remove connections to/from this node
  delete workflow.connections[nodeName]
  for (const sourceNode of Object.keys(workflow.connections)) {
    const sourceConnections = workflow.connections[sourceNode]
    if (sourceConnections?.main) {
      for (const mainConnection of sourceConnections.main) {
        const filtered = mainConnection.filter((conn) => conn.node !== nodeName)
        mainConnection.length = 0
        mainConnection.push(...filtered)
      }
    }
  }

  // Save the updated workflow (sanitize to remove read-only fields)
  const cleanedWorkflow = sanitizeWorkflowForUpdate(workflow)
  return n8nRequest<N8nWorkflow>(`/workflows/${workflowId}`, 'PUT', cleanedWorkflow)
}
