import { useSettingsStore } from '@/stores/settingsStore'

export interface WorkflowContext {
  isN8nPage: boolean
  workflowId?: string
  workflowName?: string
  nodes?: Array<{ name: string; type: string }>
  currentUrl: string
  screenshot?: string
}

// Connection type for n8n workflows
export interface N8nConnection {
  node: string
  type: string
  index: number
}

export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  nodes: Array<{
    id: string
    name: string
    type: string
    typeVersion?: number
    parameters: Record<string, unknown>
    position: [number, number]
  }>
  connections: Record<string, { main: N8nConnection[][] }>
  settings?: Record<string, unknown>
}

/**
 * Capture context from the current browser tab
 */
export async function captureContext(): Promise<WorkflowContext> {
  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const currentUrl = tab?.url || ''

  // Check if this is an n8n page
  const isN8nPage = currentUrl.includes('n8n') ||
                    currentUrl.includes('/workflow/') ||
                    currentUrl.includes('/workflows/')

  const context: WorkflowContext = {
    isN8nPage,
    currentUrl,
  }

  if (!isN8nPage || !tab?.id) {
    return context
  }

  // Try to extract workflow data from the page
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractWorkflowFromPage,
    })

    if (result?.result) {
      context.workflowId = result.result.workflowId
      context.workflowName = result.result.workflowName
      context.nodes = result.result.nodes
    }
  } catch (error) {
    console.warn('Could not extract workflow data from page:', error)
  }

  return context
}

/**
 * Function injected into the page to extract workflow data
 */
function extractWorkflowFromPage(): {
  workflowId?: string
  workflowName?: string
  nodes?: Array<{ name: string; type: string }>
} {
  // Try to get workflow ID from URL - handle various n8n URL formats
  // Examples: /workflow/abc123, /workflows/abc123, /workflow/abc123/executions
  const urlMatch = window.location.href.match(/workflow[s]?\/([a-zA-Z0-9_-]+)(?:\/|$|\?)/)
  let workflowId = urlMatch ? urlMatch[1] : undefined

  // Exclude "new" as it's not a valid workflow ID (new workflow being created)
  if (workflowId === 'new') {
    workflowId = undefined
  }

  // Try to get workflow name from the page
  const nameEl = document.querySelector('[data-test-id="workflow-name-input"]') ||
                 document.querySelector('.workflow-name') ||
                 document.querySelector('h1')
  const workflowName = nameEl?.textContent?.trim()

  // Try to extract visible nodes
  const nodeElements = document.querySelectorAll('[data-test-id^="node-"], .node-wrapper, [data-name]')
  const nodes: Array<{ name: string; type: string }> = []

  nodeElements.forEach((el) => {
    const name = el.getAttribute('data-name') ||
                 el.querySelector('.node-name, .node-title')?.textContent?.trim()
    const type = el.getAttribute('data-node-type') ||
                 el.getAttribute('data-type') ||
                 'unknown'

    if (name) {
      nodes.push({ name, type })
    }
  })

  return { workflowId, workflowName, nodes }
}

/**
 * Capture a screenshot of the visible tab
 */
export async function captureScreenshot(): Promise<string | null> {
  try {
    console.log('[n8n-copilot] Requesting screenshot from background...')
    const result = await chrome.runtime.sendMessage({ type: 'CAPTURE_SCREENSHOT' })
    console.log('[n8n-copilot] Screenshot result:', result?.success ? 'success' : 'failed', result?.error || '')

    if (result?.success && result.screenshot) {
      console.log('[n8n-copilot] Screenshot size:', result.screenshot.length, 'chars')
      return result.screenshot
    }

    console.error('[n8n-copilot] Screenshot capture failed:', result?.error || 'No screenshot data returned')
    return null
  } catch (error) {
    console.error('[n8n-copilot] Screenshot capture exception:', error)
    return null
  }
}

/**
 * Fetch full workflow data from n8n API
 */
export async function fetchWorkflowFromN8n(workflowId: string): Promise<N8nWorkflow | null> {
  const { n8nInstanceUrl, n8nApiKey, n8nConnected } = useSettingsStore.getState()

  if (!n8nConnected || !n8nInstanceUrl || !n8nApiKey) {
    console.warn('n8n not connected, cannot fetch workflow')
    return null
  }

  try {
    const response = await fetch(`${n8nInstanceUrl}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch workflow: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching workflow from n8n:', error)
    return null
  }
}

/**
 * Update a workflow in n8n (uses PUT - full replacement)
 * Note: n8n API uses PUT not PATCH, so we need to send the complete workflow object
 */
export async function updateWorkflowInN8n(
  workflowId: string,
  workflow: Partial<N8nWorkflow>
): Promise<boolean> {
  const { n8nInstanceUrl, n8nApiKey, n8nConnected } = useSettingsStore.getState()

  if (!n8nConnected || !n8nInstanceUrl || !n8nApiKey) {
    throw new Error('n8n not connected')
  }

  try {
    // First fetch the current workflow to merge with updates
    const getResponse = await fetch(`${n8nInstanceUrl}/api/v1/workflows/${workflowId}`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!getResponse.ok) {
      throw new Error(`Failed to fetch current workflow: ${getResponse.status}`)
    }

    const currentWorkflow = await getResponse.json()

    // Merge current workflow with updates
    const updatedWorkflow = {
      ...currentWorkflow,
      ...workflow,
      id: workflowId, // Ensure ID doesn't change
    }

    // Use PUT to update the entire workflow
    const response = await fetch(`${n8nInstanceUrl}/api/v1/workflows/${workflowId}`, {
      method: 'PUT',
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatedWorkflow),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to update workflow: ${response.status}`)
    }

    return true
  } catch (error) {
    console.error('Error updating workflow in n8n:', error)
    throw error
  }
}

/**
 * List workflows from n8n
 */
export async function listWorkflowsFromN8n(): Promise<Array<{ id: string; name: string; active: boolean }>> {
  const { n8nInstanceUrl, n8nApiKey, n8nConnected } = useSettingsStore.getState()

  if (!n8nConnected || !n8nInstanceUrl || !n8nApiKey) {
    return []
  }

  try {
    const response = await fetch(`${n8nInstanceUrl}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': n8nApiKey,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to list workflows: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Error listing workflows from n8n:', error)
    return []
  }
}
