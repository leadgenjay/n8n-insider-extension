import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ActionPreview } from '@/lib/tool-executor'
import { cn } from '@/lib/utils'

interface ActionConfirmationProps {
  preview: ActionPreview
  onConfirm: () => void
  onCancel: () => void
  isExecuting?: boolean
}

export function ActionConfirmation({
  preview,
  onConfirm,
  onCancel,
  isExecuting = false,
}: ActionConfirmationProps) {
  const isDestructive = preview.toolName.includes('delete')

  return (
    <div className="bg-white border border-amber-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg',
            isDestructive ? 'bg-red-100' : 'bg-amber-100'
          )}
        >
          {preview.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isDestructive && (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <h4 className="font-medium text-sm">
              {preview.description}
            </h4>
          </div>

          <p className="text-sm text-muted-foreground mb-3">
            {preview.confirmMessage}
          </p>

          {/* Show relevant args */}
          {Object.keys(preview.args).length > 0 && (
            <div className="bg-gray-50 rounded-md p-2 mb-3 text-xs font-mono">
              {Object.entries(preview.args).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-gray-500">{key}:</span>
                  <span className="text-gray-700 truncate">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isDestructive ? 'destructive' : 'default'}
              onClick={onConfirm}
              disabled={isExecuting}
              className="gap-1"
            >
              {isExecuting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              {isExecuting ? 'Executing...' : 'Confirm'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancel}
              disabled={isExecuting}
              className="gap-1"
            >
              <XCircle className="w-3 h-3" />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ActionResultProps {
  toolName: string
  success: boolean
  result?: unknown
  error?: string
  userCancelled?: boolean
}

export function ActionResult({
  toolName,
  success,
  result,
  error,
  userCancelled,
}: ActionResultProps) {
  return (
    <div
      className={cn(
        'rounded-lg p-3 text-sm',
        success
          ? 'bg-green-50 border border-green-200'
          : userCancelled
            ? 'bg-gray-50 border border-gray-200'
            : 'bg-red-50 border border-red-200'
      )}
    >
      <div className="flex items-center gap-2">
        {success ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : userCancelled ? (
          <XCircle className="w-4 h-4 text-gray-500" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-red-600" />
        )}
        <span
          className={cn(
            'font-medium',
            success
              ? 'text-green-800'
              : userCancelled
                ? 'text-gray-600'
                : 'text-red-800'
          )}
        >
          {success
            ? `${toolName} completed successfully`
            : userCancelled
              ? `${toolName} cancelled`
              : `${toolName} failed`}
        </span>
      </div>
      {error && !userCancelled && (
        <p className="mt-1 text-red-600 text-xs">{error}</p>
      )}
      {success && result !== undefined && result !== null && (
        <p className="mt-1 text-green-700 text-xs">
          {typeof result === 'object' ? JSON.stringify(result) : String(result)}
        </p>
      )}
    </div>
  )
}
