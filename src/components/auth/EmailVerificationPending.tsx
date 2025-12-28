import { useState } from 'react'
import { Mail, RefreshCw, CheckCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'

interface EmailVerificationPendingProps {
  email: string
  onBackToLogin: () => void
}

export function EmailVerificationPending({ email, onBackToLogin }: EmailVerificationPendingProps) {
  const { resendVerificationEmail, resendLoading, resendSuccess, resendError, clearSignupState } = useAuthStore()
  const [cooldown, setCooldown] = useState(false)

  const handleResend = async () => {
    if (cooldown) return

    try {
      await resendVerificationEmail(email)
      // Start 60-second cooldown to prevent spam
      setCooldown(true)
      setTimeout(() => setCooldown(false), 60000)
    } catch {
      // Error handled by store
    }
  }

  const handleBackToLogin = () => {
    clearSignupState()
    onBackToLogin()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary mx-auto mb-4 flex items-center justify-center">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold">Check your email</h1>
          <p className="text-sm text-muted-foreground mt-1">
            We sent a verification link to
          </p>
          <p className="text-sm font-medium text-foreground mt-1">
            {email}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the link in your email to verify your account and start using N8N Insider.
            </p>

            {resendSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-xs text-green-700">Verification email sent!</p>
              </div>
            )}

            {resendError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-xs text-destructive">{resendError}</p>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resendLoading || cooldown}
            >
              {resendLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : cooldown ? (
                'Email sent - wait 60s to resend'
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Resend verification email
                </>
              )}
            </Button>

            <div className="pt-2">
              <button
                type="button"
                className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                onClick={handleBackToLogin}
              >
                <ArrowLeft className="w-3 h-3" />
                Back to sign in
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Didn't receive the email? Check your spam folder or try a different email address.
        </p>
      </div>
    </div>
  )
}
