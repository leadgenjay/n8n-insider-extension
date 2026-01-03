import { useState } from 'react'
import { X, Check, AlertCircle, Loader2, LogOut, ExternalLink, CreditCard, Play, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSettingsStore, AI_MODELS, type AssistantMode } from '@/stores/settingsStore'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import type { Profile } from '@/lib/supabase'

// Stripe Payment Link
const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/6oU14mcrU7QF4Ev3gK4ko0w'
// Stripe Customer Portal - for managing subscriptions
const STRIPE_PORTAL_LINK = 'https://billing.stripe.com/p/login/cN23e7dmD84e3IYaEE'
// Setup video walkthrough
const SETUP_VIDEO_URL = 'https://www.loom.com/share/e4b2d8d73ed64182b53c5217a41e5e81'

// Get subscription display info
function getSubscriptionInfo(profile: Profile | null): {
  label: string
  sublabel?: string
  action: 'upgrade' | 'manage' | 'resubscribe' | 'update_payment' | 'none'
  variant: 'default' | 'warning' | 'success'
} {
  if (!profile) return { label: 'Free Plan', action: 'upgrade', variant: 'default' }

  if (profile.is_lifetime) {
    return { label: 'Pro (Lifetime)', action: 'none', variant: 'success' }
  }

  switch (profile.subscription_status) {
    case 'active':
      return { label: 'Pro Plan', sublabel: '$10/mo', action: 'manage', variant: 'success' }
    case 'canceled':
      const endDate = profile.subscription_end_date
        ? new Date(profile.subscription_end_date).toLocaleDateString()
        : 'soon'
      return {
        label: 'Pro (Canceled)',
        sublabel: `Access until ${endDate}`,
        action: 'resubscribe',
        variant: 'warning'
      }
    case 'past_due':
      return {
        label: 'Payment Failed',
        sublabel: 'Update payment method',
        action: 'update_payment',
        variant: 'warning'
      }
    default:
      return { label: 'Free Plan', sublabel: '50 requests/day', action: 'upgrade', variant: 'default' }
  }
}

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const {
    n8nInstanceUrl,
    n8nApiKey,
    openRouterApiKey,
    tavilyApiKey,
    selectedModel,
    n8nConnected,
    openRouterConnected,
    tavilyConnected,
    n8nError,
    openRouterError,
    tavilyError,
    assistantMode,
    setN8nConfig,
    setOpenRouterConfig,
    setTavilyConfig,
    setSelectedModel,
    setAssistantMode,
    testN8nConnection,
    testOpenRouterConnection,
    testTavilyConnection,
  } = useSettingsStore()

  const { profile, signOut } = useAuthStore()

  const [localN8nUrl, setLocalN8nUrl] = useState(n8nInstanceUrl)
  const [localN8nKey, setLocalN8nKey] = useState(n8nApiKey)
  const [localOpenRouterKey, setLocalOpenRouterKey] = useState(openRouterApiKey)
  const [localTavilyKey, setLocalTavilyKey] = useState(tavilyApiKey)
  const [testingN8n, setTestingN8n] = useState(false)
  const [testingOpenRouter, setTestingOpenRouter] = useState(false)
  const [testingTavily, setTestingTavily] = useState(false)

  const handleSaveN8n = async () => {
    setN8nConfig(localN8nUrl, localN8nKey)
    setTestingN8n(true)
    await testN8nConnection()
    setTestingN8n(false)
  }

  const handleSaveOpenRouter = async () => {
    setOpenRouterConfig(localOpenRouterKey)
    setTestingOpenRouter(true)
    await testOpenRouterConnection()
    setTestingOpenRouter(false)
  }

  const handleSaveTavily = async () => {
    setTavilyConfig(localTavilyKey)
    setTestingTavily(true)
    await testTavilyConnection()
    setTestingTavily(false)
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto h-[calc(100%-65px)]">
          {/* Account Section */}
          <section>
            <h3 className="text-sm font-medium mb-4">Account</h3>
            <SubscriptionCard profile={profile} />
          </section>

          {/* Setup Guide */}
          <section>
            <h3 className="text-sm font-medium mb-2">Getting Started</h3>
            <a
              href={SETUP_VIDEO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-border bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Play className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Watch Setup Guide</p>
                <p className="text-xs text-muted-foreground">Learn how to configure the extension</p>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </section>

          {/* Assistant Mode */}
          <section>
            <h3 className="text-sm font-medium mb-2">Assistant Mode</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Choose how the AI assistant interacts with your n8n instance
            </p>
            <div className="space-y-2">
              <ModeOption
                mode="helper"
                currentMode={assistantMode}
                title="Helper Mode"
                description="AI gives suggestions and explanations only. You make all changes manually."
                onChange={setAssistantMode}
              />
              <ModeOption
                mode="builder"
                currentMode={assistantMode}
                title="Builder Mode"
                description="AI can create workflows, add nodes, and make changes directly in n8n."
                onChange={setAssistantMode}
              />
            </div>
          </section>

          {/* n8n Configuration */}
          <section>
            <h3 className="text-sm font-medium mb-4">n8n Instance</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Instance URL</label>
                <Input
                  type="url"
                  placeholder="https://your-n8n-instance.com"
                  value={localN8nUrl}
                  onChange={(e) => setLocalN8nUrl(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">API Key</label>
                <Input
                  type="password"
                  placeholder="n8n API key"
                  value={localN8nKey}
                  onChange={(e) => setLocalN8nKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button onClick={handleSaveN8n} disabled={testingN8n} size="sm">
                    {testingN8n ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-2" />
                        Testing...
                      </>
                    ) : (
                      'Save & Test'
                    )}
                  </Button>
                  <ConnectionStatus connected={n8nConnected} />
                </div>
                {n8nError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-700">{n8nError}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  URL format: https://your-n8n.com (without /api/v1)
                </p>
              </div>
            </div>
          </section>

          {/* OpenRouter Configuration */}
          <section>
            <h3 className="text-sm font-medium mb-4">AI Provider (OpenRouter)</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">API Key</label>
                <Input
                  type="password"
                  placeholder="sk-or-..."
                  value={localOpenRouterKey}
                  onChange={(e) => setLocalOpenRouterKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Get your key at{' '}
                  <a
                    href="https://openrouter.ai/keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    openrouter.ai/keys
                  </a>
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button onClick={handleSaveOpenRouter} disabled={testingOpenRouter} size="sm">
                    {testingOpenRouter ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-2" />
                        Testing...
                      </>
                    ) : (
                      'Save & Test'
                    )}
                  </Button>
                  <ConnectionStatus connected={openRouterConnected} />
                </div>
                {openRouterError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-700">{openRouterError}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Model Selection */}
          <section>
            <h3 className="text-sm font-medium mb-2">AI Model</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Vision-enabled models only (required for screenshot analysis)
            </p>
            <div className="space-y-2">
              {AI_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-colors',
                    selectedModel === model.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{model.name}</span>
                      {model.recommended && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                          Recommended
                        </span>
                      )}
                    </div>
                    {selectedModel === model.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Web Search Configuration (Optional) */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Web Search (Optional)</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Enable AI to search for API documentation when troubleshooting
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Tavily API Key</label>
                <Input
                  type="password"
                  placeholder="tvly-..."
                  value={localTavilyKey}
                  onChange={(e) => setLocalTavilyKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Free tier: 1000 searches/month.{' '}
                  <a
                    href="https://tavily.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Get your key at tavily.com
                  </a>
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Button onClick={handleSaveTavily} disabled={testingTavily} size="sm">
                    {testingTavily ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin mr-2" />
                        Testing...
                      </>
                    ) : (
                      'Save & Test'
                    )}
                  </Button>
                  <ConnectionStatus connected={tavilyConnected} />
                </div>
                {tavilyError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-700">{tavilyError}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Sign Out */}
          <section className="pt-4 border-t border-border">
            <Button variant="outline" className="w-full" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </section>
        </div>
      </div>
    </div>
  )
}

function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div className={cn('flex items-center gap-1 text-xs', connected ? 'text-green-600' : 'text-muted-foreground')}>
      {connected ? (
        <>
          <Check className="w-3 h-3" />
          Connected
        </>
      ) : (
        <>
          <AlertCircle className="w-3 h-3" />
          Not connected
        </>
      )}
    </div>
  )
}

function ModeOption({
  mode,
  currentMode,
  title,
  description,
  onChange,
}: {
  mode: AssistantMode
  currentMode: AssistantMode
  title: string
  description: string
  onChange: (mode: AssistantMode) => void
}) {
  const isSelected = mode === currentMode

  return (
    <button
      onClick={() => onChange(mode)}
      className={cn(
        'w-full p-3 rounded-lg border text-left transition-colors',
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{title}</span>
        {isSelected && <Check className="w-4 h-4 text-primary" />}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </button>
  )
}

function SubscriptionCard({ profile }: { profile: Profile | null }) {
  const info = getSubscriptionInfo(profile)

  const getActionButton = () => {
    switch (info.action) {
      case 'upgrade':
        return (
          <a
            href={`${STRIPE_PAYMENT_LINK}?client_reference_id=${profile?.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Upgrade - $10/mo
            <ExternalLink className="w-3 h-3" />
          </a>
        )
      case 'manage':
        return (
          <a
            href={STRIPE_PORTAL_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-secondary"
          >
            <CreditCard className="w-3 h-3" />
            Manage
          </a>
        )
      case 'resubscribe':
        return (
          <a
            href={`${STRIPE_PAYMENT_LINK}?client_reference_id=${profile?.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Resubscribe
            <ExternalLink className="w-3 h-3" />
          </a>
        )
      case 'update_payment':
        return (
          <a
            href={STRIPE_PORTAL_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600"
          >
            Update Payment
            <ExternalLink className="w-3 h-3" />
          </a>
        )
      default:
        return null
    }
  }

  return (
    <div className={cn(
      'p-4 rounded-lg',
      info.variant === 'success' ? 'bg-green-50 border border-green-200' :
      info.variant === 'warning' ? 'bg-amber-50 border border-amber-200' :
      'bg-secondary'
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-sm">{profile?.email}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn(
              'text-xs font-medium',
              info.variant === 'success' ? 'text-green-700' :
              info.variant === 'warning' ? 'text-amber-700' :
              'text-muted-foreground'
            )}>
              {info.label}
            </span>
            {info.sublabel && (
              <span className="text-xs text-muted-foreground">
                • {info.sublabel}
              </span>
            )}
          </div>
        </div>
        {getActionButton()}
      </div>
    </div>
  )
}
