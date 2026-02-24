import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { isManagerOrSuperAdmin } from '@/lib/roles'

/** Allows super_admin or bd_manager. BD/developer redirected. */
export const ManagerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!isManagerOrSuperAdmin(user)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
