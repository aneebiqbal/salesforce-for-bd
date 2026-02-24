import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin, isDeveloper } from '@/lib/roles'

export const DashboardRedirect = () => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (!user) return null

  if (isSuperAdmin(user)) return <Navigate to="/dashboard/admin" replace />
  if (isDeveloper(user)) return <Navigate to="/dashboard/dev" replace />
  return <Navigate to="/dashboard/bd" replace />
}
