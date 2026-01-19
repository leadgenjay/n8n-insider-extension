import { create } from 'zustand'

const CACHE_TTL_MS = 300000 // 5 minutes - extended for better performance

export interface CapturedContext {
  screenshot?: string
  workflowData?: Record<string, unknown>
  workflowId?: string
  currentUrl?: string
  capturedAt: number
}

interface ContextCacheState {
  cachedContext: CapturedContext | null
  lastUrl: string | null
  lastWorkflowId: string | null
  isCapturing: boolean

  setCachedContext: (context: CapturedContext | null) => void
  setCapturing: (capturing: boolean) => void
  shouldRefreshContext: (currentUrl: string, currentWorkflowId?: string) => boolean
  invalidateCache: () => void
}

export const useContextCacheStore = create<ContextCacheState>((set, get) => ({
  cachedContext: null,
  lastUrl: null,
  lastWorkflowId: null,
  isCapturing: false,

  setCachedContext: (context) => {
    set({
      cachedContext: context,
      lastUrl: context?.currentUrl || null,
      lastWorkflowId: context?.workflowId || null,
    })
  },

  setCapturing: (capturing) => set({ isCapturing: capturing }),

  shouldRefreshContext: (currentUrl, currentWorkflowId) => {
    const { cachedContext, lastUrl, lastWorkflowId } = get()

    // No cache = needs refresh
    if (!cachedContext) return true

    // URL changed = needs refresh
    if (currentUrl !== lastUrl) return true

    // Workflow ID changed = needs refresh
    if (currentWorkflowId !== lastWorkflowId) return true

    // Cache expired = needs refresh
    const age = Date.now() - cachedContext.capturedAt
    if (age > CACHE_TTL_MS) return true

    return false
  },

  invalidateCache: () => {
    set({
      cachedContext: null,
      lastUrl: null,
      lastWorkflowId: null,
    })
  },
}))
