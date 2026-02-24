import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin } from '@/lib/roles'

export const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!isSuperAdmin(user)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
