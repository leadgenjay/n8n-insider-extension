import { Settings, Plus, MessageSquare, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'

interface HeaderProps {
  onSettingsClick: () => void
  onSidebarClick: () => void
}

export function Header({ onSettingsClick, onSidebarClick }: HeaderProps) {
  const { createConversation } = useChatStore()
  const { profile } = useAuthStore()

  const handleNewChat = async () => {
    await createConversation()
  }

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-white">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onSidebarClick} title="Conversations">
          <Menu className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm">N8N Insider</span>
        </div>

        {profile?.is_lifetime && (
          <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
            Pro
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={handleNewChat} title="New chat">
          <Plus className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onSettingsClick} title="Settings">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
