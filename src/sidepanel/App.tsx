import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useContextCacheStore } from '@/stores/contextCacheStore'
import { Header } from '@/components/layout/Header'
import { ChatContainer } from '@/components/chat/ChatContainer'
import { MessageInput } from '@/components/chat/MessageInput'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { ConversationSidebar } from '@/components/chat/ConversationSidebar'
import { LoginForm } from '@/components/auth/LoginForm'
import { WelcomeModal } from '@/components/auth/WelcomeModal'

const WELCOME_SHOWN_KEY = 'n8n_insider_welcome_shown'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const { user, loading, initialize } = useAuthStore()
  const { invalidateCache } = useContextCacheStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  // Show welcome modal for new users
  useEffect(() => {
    if (user) {
      const hasSeenWelcome = localStorage.getItem(WELCOME_SHOWN_KEY)
      if (!hasSeenWelcome) {
        setShowWelcome(true)
      }
    }
  }, [user])

  const handleCloseWelcome = () => {
    localStorage.setItem(WELCOME_SHOWN_KEY, 'true')
    setShowWelcome(false)
  }

  // Listen for URL/tab changes from background script to invalidate context cache
  useEffect(() => {
    const handleMessage = (message: { type: string; url?: string }) => {
      if (message.type === 'URL_CHANGED' || message.type === 'TAB_CHANGED') {
        // Invalidate context cache when URL or tab changes
        invalidateCache()
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage)
    return () => chrome.runtime.onMessage.removeListener(handleMessage)
  }, [invalidateCache])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header
        onSettingsClick={() => setShowSettings(true)}
        onSidebarClick={() => setShowSidebar(true)}
      />

      <main className="flex-1 overflow-hidden flex flex-col">
        <ChatContainer />
        <MessageInput />
      </main>

      <ConversationSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
      />

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {showWelcome && (
        <WelcomeModal onClose={handleCloseWelcome} />
      )}
    </div>
  )
}
