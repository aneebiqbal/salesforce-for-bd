import * as React from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: import('@/types').UserRole[]
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, session, loading, sessionExpiredOrSignedOut, refreshProfile } = useAuth()
  const [retrying, setRetrying] = React.useState(false)

  if (loading) {
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
          <p className="text-muted-foreground">Profile setup incomplete. We couldn’t load your profile.</p>
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
            {retrying ? 'Retrying…' : 'Retry'}
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
          <p className="text-muted-foreground">You don’t have access to this page.</p>
          <a href="/dashboard" className="text-primary underline">
            Go to dashboard
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
