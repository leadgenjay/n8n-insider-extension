import { useState } from 'react'
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ForgotPasswordFormProps {
  onBack: () => void
  onSuccess: (email: string) => void
}

export function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('')
  const [success, setSuccess] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [localLoading, setLocalLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setLocalLoading(true)
    
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://templates.n8ninsider.com/reset-password',
      })
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to send reset email.')
    } finally {
      setLocalLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img
            src="/icons/icon128.png"
            alt="N8N Insider"
            className="w-16 h-16 mx-auto mb-4"
          />
          <h1 className="text-xl font-bold">N8N Insider</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reset your password
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          {success ? (
            <div className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Check your email</h2>
              <p className="text-sm text-muted-foreground mb-4">
                We sent a password reset link to <strong>{email}</strong>
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Click the link in the email to reset your password.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onBack}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to sign in
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={localLoading}
                  />
                </div>

                {localError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-xs text-destructive">{localError}</p>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={localLoading}>
                  {localLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </Button>
              </form>

              <button
                type="button"
                className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2"
                onClick={onBack}
                disabled={localLoading}
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
