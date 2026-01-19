import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

const DAILY_FREE_LIMIT = 50

interface UsageState {
  // Usage tracking
  dailyCount: number
  lastResetDate: string // ISO date string (YYYY-MM-DD)

  // Actions
  checkAndIncrementUsage: () => Promise<{ allowed: boolean; remaining?: number }>
  resetIfNewDay: () => void
}

// Get today's date in YYYY-MM-DD format
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
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

export const useUsageStore = create<UsageState>()(
  persist(
    (set, get) => ({
      dailyCount: 0,
      lastResetDate: getTodayDate(),

      resetIfNewDay: () => {
        const today = getTodayDate()
        const { lastResetDate } = get()

        if (lastResetDate !== today) {
          console.log('[usage] New day detected, resetting usage count')
          set({ dailyCount: 0, lastResetDate: today })
        }
      },

      checkAndIncrementUsage: async (): Promise<{ allowed: boolean; remaining?: number }> => {
        // First reset if new day
        get().resetIfNewDay()

        const { dailyCount } = get()

        // Check if under limit
        if (dailyCount >= DAILY_FREE_LIMIT) {
          return { allowed: false, remaining: 0 }
        }

        // Increment usage
        const newCount = dailyCount + 1
        set({ dailyCount: newCount })

        return {
          allowed: true,
          remaining: DAILY_FREE_LIMIT - newCount,
        }
      },
    }),
    {
      name: 'n8n-insider-usage',
      storage: createJSONStorage(() => chromeStorageAdapter),
    }
  )
)
