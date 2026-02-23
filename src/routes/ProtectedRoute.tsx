import * as React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: import('@/types').UserRole[]
}

// Grace period before showing profile-load-failed error.
// On hard refresh, session is restored before user_profiles fetch completes —
// we silently retry for this long before surfacing the error UI.
const PROFILE_GRACE_MS = 4000

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, session, loading, sessionExpiredOrSignedOut, refreshProfile } = useAuth()
  const [retrying, setRetrying] = React.useState(false)
  const [showProfileError, setShowProfileError] = React.useState(false)

  React.useEffect(() => {
    if (!session || user || loading) {
      setShowProfileError(false)
      return
    }
    // Session exists but user profile not loaded — auto-retry after 1.5s
    const retryTimer = window.setTimeout(() => {
      void refreshProfile().catch(() => {})
    }, 1500)
    // Show error UI only after grace period
    const errorTimer = window.setTimeout(() => setShowProfileError(true), PROFILE_GRACE_MS)
    return () => {
      window.clearTimeout(retryTimer)
      window.clearTimeout(errorTimer)
    }
  }, [session, user, loading, refreshProfile])

  // Show spinner while loading OR during the silent retry grace period
  if (loading || (session && !user && !showProfileError)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden />
      </div>
    )
  }

  if (session && !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="font-medium">Couldn&apos;t load your profile</p>
          <p className="text-sm text-muted-foreground">
            Your session is active but your account details didn&apos;t load.
            This sometimes happens after a hard refresh — tap Retry to fix it.
          </p>
          <Button
            disabled={retrying}
            onClick={async () => {
              setRetrying(true)
              try {
                await refreshProfile()
              } finally {
                setRetrying(false)
              }
            }}
          >
            {retrying ? 'Loading…' : 'Retry'}
          </Button>
        </div>
      </div>
    )
  }

  if (!session || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-muted-foreground">
            {sessionExpiredOrSignedOut ? 'Session expired. Please log in again.' : 'Please log in to continue.'}
          </p>
          <Button asChild>
            <Link to="/login">Go to login</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">You don&apos;t have access to this page.</p>
          <Link to="/dashboard" className="text-primary underline">
            Go to dashboard
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
