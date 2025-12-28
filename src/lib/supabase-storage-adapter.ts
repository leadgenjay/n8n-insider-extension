// Custom storage adapter for Supabase to work with chrome.storage.local
// This replaces localStorage which is not available in extension contexts

export const chromeStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(key, (result) => {
        const value = result[key]
        resolve(typeof value === 'string' ? value : null)
      })
    })
  },

  setItem: async (key: string, value: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, () => {
        resolve()
      })
    })
  },

  removeItem: async (key: string): Promise<void> => {
    return new Promise((resolve) => {
      chrome.storage.local.remove(key, () => {
        resolve()
      })
    })
  },
}

// Synchronous wrapper for contexts where async is not supported
export const chromeStorageAdapterSync = {
  getItem: (key: string): string | null => {
    // This will be null initially but will be populated by the auth state change listener
    let value: string | null = null
    chrome.storage.local.get(key, (result) => {
      const storedValue = result[key]
      value = typeof storedValue === 'string' ? storedValue : null
    })
    return value
  },

  setItem: (key: string, value: string): void => {
    chrome.storage.local.set({ [key]: value })
  },

  removeItem: (key: string): void => {
    chrome.storage.local.remove(key)
  },
}
