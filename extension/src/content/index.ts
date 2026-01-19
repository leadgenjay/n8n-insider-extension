// Content script for N8N Insider
// Extracts workflow data from n8n editor pages

interface N8nWorkflowData {
  workflowId?: string
  workflowName?: string
  nodes?: Array<{
    name: string
    type: string
  }>
  isN8nPage: boolean
}

function extractWorkflowData(): N8nWorkflowData {
  // Check if we're on an n8n page
  const isN8nPage =
    document.querySelector('[data-test-id="workflow-canvas"]') !== null ||
    document.querySelector('.n8n-canvas') !== null ||
    window.location.href.includes('n8n') ||
    document.title.toLowerCase().includes('n8n')

  if (!isN8nPage) {
    return { isN8nPage: false }
  }

  // Try to extract workflow name from the page title or header
  const workflowName =
    document.querySelector('[data-test-id="workflow-name-input"]')?.textContent ||
    document.querySelector('.workflow-name')?.textContent ||
    document.title.replace(' - n8n', '').trim()

  // Try to extract visible node names from the canvas
  const nodeElements = document.querySelectorAll('[data-test-id^="node-"], .node-wrapper')
  const nodes: Array<{ name: string; type: string }> = []

  nodeElements.forEach((el) => {
    const name = el.querySelector('.node-name, .node-title')?.textContent
    const type = el.getAttribute('data-node-type') || 'unknown'
    if (name) {
      nodes.push({ name: name.trim(), type })
    }
  })

  // Try to extract workflow ID from URL
  const urlMatch = window.location.href.match(/workflow[s]?\/([a-zA-Z0-9]+)/)
  const workflowId = urlMatch ? urlMatch[1] : undefined

  return {
    isN8nPage: true,
    workflowId,
    workflowName,
    nodes: nodes.length > 0 ? nodes : undefined,
  }
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'EXTRACT_WORKFLOW':
      const data = extractWorkflowData()
      sendResponse(data)
      break

    case 'GET_PAGE_INFO':
      sendResponse({
        url: window.location.href,
        title: document.title,
        isN8nPage: extractWorkflowData().isN8nPage,
      })
      break

    default:
      console.log('Unknown message type:', message.type)
  }
})

// Notify that content script is loaded
console.log('[N8N Insider] Content script loaded')

export {}
