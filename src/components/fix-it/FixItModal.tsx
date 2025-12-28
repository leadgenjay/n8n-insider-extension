import { useState, useEffect } from 'react'
import { X, Loader2, Check, AlertTriangle, Wand2, Copy, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateWorkflowInN8n, type N8nWorkflow } from '@/lib/context-capture'
import { generateWorkflowFix } from '@/lib/openrouter'

interface FixItModalProps {
  isOpen: boolean
  onClose: () => void
  workflowId: string
  currentWorkflow: N8nWorkflow
  issue: string
}

export function FixItModal({
  isOpen,
  onClose,
  workflowId,
  currentWorkflow,
  issue,
}: FixItModalProps) {
  const [stage, setStage] = useState<'analyzing' | 'preview' | 'applying' | 'success' | 'error'>('analyzing')
  const [suggestion, setSuggestion] = useState<string>('')
  const [modifiedWorkflow, setModifiedWorkflow] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Start analysis when modal opens
  useEffect(() => {
    if (isOpen) {
      analyzeWorkflow()
    }
  }, [isOpen])

  const analyzeWorkflow = async () => {
    setStage('analyzing')
    setError(null)

    try {
      const result = await generateWorkflowFix(currentWorkflow as unknown as Record<string, unknown>, issue)
      setSuggestion(result.suggestion)
      setModifiedWorkflow(result.modifiedWorkflow || null)
      setStage('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze workflow')
      setStage('error')
    }
  }

  const applyFix = async () => {
    if (!modifiedWorkflow) {
      setError('No modified workflow to apply')
      return
    }

    setStage('applying')

    try {
      await updateWorkflowInN8n(workflowId, modifiedWorkflow as Partial<N8nWorkflow>)
      setStage('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply fix')
      setStage('error')
    }
  }

  const copyToClipboard = async () => {
    if (modifiedWorkflow) {
      await navigator.clipboard.writeText(JSON.stringify(modifiedWorkflow, null, 2))
    }
  }

  const downloadWorkflow = () => {
    if (modifiedWorkflow) {
      const blob = new Blob([JSON.stringify(modifiedWorkflow, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${currentWorkflow.name || 'workflow'}-fixed.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Fix It</h2>
              <p className="text-xs text-muted-foreground">AI-powered workflow repair</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {stage === 'analyzing' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Analyzing workflow...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
            </div>
          )}

          {stage === 'preview' && (
            <div className="space-y-6">
              {/* Issue */}
              <div>
                <h3 className="text-sm font-medium mb-2">Issue</h3>
                <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-lg">{issue}</p>
              </div>

              {/* Suggestion */}
              <div>
                <h3 className="text-sm font-medium mb-2">Suggested Fix</h3>
                <div className="prose prose-sm max-w-none bg-secondary/50 p-4 rounded-lg overflow-x-auto">
                  <pre className="whitespace-pre-wrap text-xs">{suggestion}</pre>
                </div>
              </div>

              {/* Modified Workflow Preview */}
              {modifiedWorkflow && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium">Modified Workflow</h3>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                      <Button variant="ghost" size="sm" onClick={downloadWorkflow}>
                        <Download className="w-3 h-3 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-64">
                    <pre className="text-xs text-gray-100">
                      {JSON.stringify(modifiedWorkflow, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Review before applying</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Always review the suggested changes before applying them to your workflow.
                    Consider testing in a non-production environment first.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stage === 'applying' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Applying fix to n8n...</p>
            </div>
          )}

          {stage === 'success' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Fix Applied!</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                The workflow has been updated in n8n. Refresh your n8n browser tab to see the changes.
              </p>
            </div>
          )}

          {stage === 'error' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Something went wrong</h3>
              <p className="text-sm text-destructive text-center max-w-sm">{error}</p>
              <Button variant="outline" onClick={analyzeWorkflow} className="mt-4">
                Try Again
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        {stage === 'preview' && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-gray-50">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            {modifiedWorkflow && (
              <Button onClick={applyFix}>
                <Wand2 className="w-4 h-4 mr-2" />
                Apply Fix to n8n
              </Button>
            )}
          </div>
        )}

        {stage === 'success' && (
          <div className="flex items-center justify-center px-6 py-4 border-t border-border bg-gray-50">
            <Button onClick={onClose}>Done</Button>
          </div>
        )}
      </div>
    </div>
  )
}
