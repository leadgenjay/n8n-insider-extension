// Background Service Worker for N8N Insider

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id })
  }
})

// Set up side panel behavior
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Failed to set panel behavior:', error))

// Listen for messages from content scripts and side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'CAPTURE_SCREENSHOT':
      captureScreenshot().then(sendResponse)
      return true // Keep message channel open for async response

    case 'GET_CURRENT_URL':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        sendResponse({ url: tabs[0]?.url || null })
      })
      return true

    case 'INJECT_CONTENT_SCRIPT':
      injectContentScript(message.tabId).then(sendResponse)
      return true

    default:
      console.log('Unknown message type:', message.type)
  }
})

async function captureScreenshot(): Promise<{ success: boolean; screenshot?: string; error?: string }> {
  try {
    console.log('[n8n-copilot-bg] Starting screenshot capture...')

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    console.log('[n8n-copilot-bg] Active tab:', tab?.id, tab?.url)

    if (!tab.id) {
      console.error('[n8n-copilot-bg] No active tab found')
      return { success: false, error: 'No active tab found' }
    }

    console.log('[n8n-copilot-bg] Calling captureVisibleTab...')
    const screenshot = await chrome.tabs.captureVisibleTab({
      format: 'png',
      quality: 90,
    })

    console.log('[n8n-copilot-bg] Screenshot captured, size:', screenshot?.length || 0)
    return { success: true, screenshot }
  } catch (error) {
    console.error('[n8n-copilot-bg] Screenshot capture error:', error)
    return { success: false, error: String(error) }
  }
}

async function injectContentScript(tabId: number): Promise<{ success: boolean; error?: string }> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['src/content/index.ts'],
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// Keep service worker alive
chrome.runtime.onInstalled.addListener(() => {
  console.log('N8N Insider installed')
})

// Listen for tab URL changes to invalidate context cache
chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
  if (changeInfo.url) {
    // Notify sidepanel that URL changed (so it can invalidate context cache)
    chrome.runtime.sendMessage({
      type: 'URL_CHANGED',
      url: changeInfo.url,
      tabId,
    }).catch(() => {
      // Sidepanel might not be open, ignore error
    })
  }
})

// Listen for tab activation changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId)
    chrome.runtime.sendMessage({
      type: 'TAB_CHANGED',
      url: tab.url,
      tabId: activeInfo.tabId,
    }).catch(() => {
      // Sidepanel might not be open, ignore error
    })
  } catch {
    // Tab might not exist, ignore error
  }
})

export {}
