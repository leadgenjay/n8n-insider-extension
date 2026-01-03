import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Vision-capable models only - required for screenshot analysis
export type AIModel =
  | 'anthropic/claude-sonnet-4'
  | 'openai/gpt-4o'
  | 'anthropic/claude-3.5-sonnet'
  | 'google/gemini-flash-1.5'
  | 'google/gemini-pro-1.5'
  | 'anthropic/claude-opus-4'

export const AI_MODELS: Array<{ id: AIModel; name: string; description: string; recommended?: boolean }> = [
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Best for n8n - fast, accurate, great vision', recommended: true },
  { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'Excellent vision, very fast responses' },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Proven quality, good balance' },
  { id: 'google/gemini-flash-1.5', name: 'Gemini 1.5 Flash', description: 'Budget-friendly, fast, good vision' },
  { id: 'google/gemini-pro-1.5', name: 'Gemini 1.5 Pro', description: 'Large context for big workflows' },
  { id: 'anthropic/claude-opus-4', name: 'Claude Opus 4', description: 'Premium - complex debugging' },
]

// Connection test result with optional error message
export interface ConnectionTestResult {
  success: boolean
  error?: string
}

// Assistant mode: Helper (suggestions only) vs Builder (takes actions)
export type AssistantMode = 'helper' | 'builder'

interface SettingsState {
  // n8n Configuration
  n8nInstanceUrl: string
  n8nApiKey: string

  // OpenRouter Configuration
  openRouterApiKey: string
  selectedModel: AIModel

  // Tavily Configuration (for web search)
  tavilyApiKey: string

  // Connection Status
  n8nConnected: boolean
  openRouterConnected: boolean
  tavilyConnected: boolean
  n8nError: string | null
  openRouterError: string | null
  tavilyError: string | null

  // Assistant Mode
  assistantMode: AssistantMode

  // Actions
  setN8nConfig: (url: string, apiKey: string) => void
  setOpenRouterConfig: (apiKey: string) => void
  setTavilyConfig: (apiKey: string) => void
  setSelectedModel: (model: AIModel) => void
  setAssistantMode: (mode: AssistantMode) => void
  testN8nConnection: () => Promise<ConnectionTestResult>
  testOpenRouterConnection: () => Promise<ConnectionTestResult>
  testTavilyConnection: () => Promise<ConnectionTestResult>
}

// Custom storage for Zustand persist using chrome.storage.local
const chromeStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(name, (result) => {
        const value = result[name]
        resolve(typeof value === 'string' ? value : null)
      })
    })
  },
  setItem: async (name: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [name]: value }, resolve)
    })
  },
  removeItem: async (name: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove(name, resolve)
    })
  },
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initial state
      n8nInstanceUrl: '',
      n8nApiKey: '',
      openRouterApiKey: '',
      tavilyApiKey: '',
      selectedModel: 'anthropic/claude-sonnet-4',
      n8nConnected: false,
      openRouterConnected: false,
      tavilyConnected: false,
      n8nError: null,
      openRouterError: null,
      tavilyError: null,
      assistantMode: 'builder', // Default to builder mode

      setN8nConfig: (url: string, apiKey: string) => {
        // Normalize the URL - remove trailing slashes and /api/v1 suffix
        let normalizedUrl = url.trim()
        // Remove trailing slashes
        while (normalizedUrl.endsWith('/')) {
          normalizedUrl = normalizedUrl.slice(0, -1)
        }
        // Remove /api/v1 if user accidentally included it (we add it automatically)
        if (normalizedUrl.endsWith('/api/v1')) {
          normalizedUrl = normalizedUrl.slice(0, -7)
        }
        if (normalizedUrl.endsWith('/api')) {
          normalizedUrl = normalizedUrl.slice(0, -4)
        }
        set({ n8nInstanceUrl: normalizedUrl, n8nApiKey: apiKey, n8nConnected: false })
      },

      setOpenRouterConfig: (apiKey: string) => {
        set({ openRouterApiKey: apiKey, openRouterConnected: false })
      },

      setTavilyConfig: (apiKey: string) => {
        set({ tavilyApiKey: apiKey, tavilyConnected: false })
      },

      setSelectedModel: (model: AIModel) => {
        set({ selectedModel: model })
      },

      setAssistantMode: (mode: AssistantMode) => {
        set({ assistantMode: mode })
      },

      testN8nConnection: async (): Promise<ConnectionTestResult> => {
        const { n8nInstanceUrl, n8nApiKey } = get()

        if (!n8nInstanceUrl) {
          const error = 'Please enter your n8n instance URL'
          set({ n8nConnected: false, n8nError: error })
          return { success: false, error }
        }

        if (!n8nApiKey) {
          const error = 'Please enter your n8n API key'
          set({ n8nConnected: false, n8nError: error })
          return { success: false, error }
        }

        const apiUrl = `${n8nInstanceUrl}/api/v1/workflows`

        try {
          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
              'X-N8N-API-KEY': n8nApiKey,
            },
          })

          // Check if response is JSON (not HTML error page)
          const contentType = response.headers.get('content-type') || ''
          const isJson = contentType.includes('application/json')

          if (!response.ok) {
            let error: string

            if (response.status === 401 || response.status === 403) {
              error = 'Invalid API key. Check your n8n API key in Settings > API.'
            } else if (response.status === 404) {
              error = `API endpoint not found. Make sure "${n8nInstanceUrl}" is correct.`
            } else if (!isJson) {
              // Got HTML instead of JSON - wrong URL
              error = `Wrong URL format. Got HTML instead of JSON. Your URL should be like "https://your-n8n.com" without /api/v1`
            } else {
              error = `Connection failed (${response.status}). Check your n8n instance URL.`
            }

            console.error('[n8n-copilot] Connection test failed:', { status: response.status, contentType })
            set({ n8nConnected: false, n8nError: error })
            return { success: false, error }
          }

          if (!isJson) {
            const error = 'n8n returned HTML instead of JSON. Check your instance URL - it should be the base URL without /api/v1'
            set({ n8nConnected: false, n8nError: error })
            return { success: false, error }
          }

          // Verify we can parse the response
          await response.json()
          set({ n8nConnected: true, n8nError: null })
          return { success: true }
        } catch (error) {
          console.error('[n8n-copilot] Connection test error:', error)

          let errorMessage: string
          if (error instanceof TypeError && error.message.includes('fetch')) {
            errorMessage = `Cannot reach "${n8nInstanceUrl}". Check the URL and make sure n8n is running.`
          } else {
            errorMessage = error instanceof Error ? error.message : 'Connection failed'
          }

          set({ n8nConnected: false, n8nError: errorMessage })
          return { success: false, error: errorMessage }
        }
      },

      testOpenRouterConnection: async (): Promise<ConnectionTestResult> => {
        const { openRouterApiKey } = get()

        if (!openRouterApiKey) {
          const error = 'Please enter your OpenRouter API key'
          set({ openRouterConnected: false, openRouterError: error })
          return { success: false, error }
        }

        try {
          const response = await fetch('https://openrouter.ai/api/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${openRouterApiKey}`,
            },
          })

          if (!response.ok) {
            let error: string
            if (response.status === 401) {
              error = 'Invalid API key. Get your key at openrouter.ai/keys'
            } else {
              error = `Connection failed (${response.status})`
            }
            set({ openRouterConnected: false, openRouterError: error })
            return { success: false, error }
          }

          set({ openRouterConnected: true, openRouterError: null })
          return { success: true }
        } catch (error) {
          const errorMessage = 'Cannot reach OpenRouter. Check your internet connection.'
          set({ openRouterConnected: false, openRouterError: errorMessage })
          return { success: false, error: errorMessage }
        }
      },

      testTavilyConnection: async (): Promise<ConnectionTestResult> => {
        const { tavilyApiKey } = get()

        if (!tavilyApiKey) {
          const error = 'Please enter your Tavily API key'
          set({ tavilyConnected: false, tavilyError: error })
          return { success: false, error }
        }

        try {
          // Test with a simple search query
          const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              api_key: tavilyApiKey,
              query: 'test',
              search_depth: 'basic',
              max_results: 1,
            }),
          })

          if (!response.ok) {
            let error: string
            if (response.status === 401 || response.status === 403) {
              error = 'Invalid API key. Get your key at tavily.com'
            } else {
              error = `Connection failed (${response.status})`
            }
            set({ tavilyConnected: false, tavilyError: error })
            return { success: false, error }
          }

          set({ tavilyConnected: true, tavilyError: null })
          return { success: true }
        } catch (error) {
          const errorMessage = 'Cannot reach Tavily. Check your internet connection.'
          set({ tavilyConnected: false, tavilyError: errorMessage })
          return { success: false, error: errorMessage }
        }
      },
    }),
    {
      name: 'n8n-copilot-settings',
      storage: createJSONStorage(() => chromeStorageAdapter),
    }
  )
)
