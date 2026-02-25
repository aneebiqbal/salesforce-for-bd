import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { isDeveloper } from '@/lib/roles'

/** Allows super_admin, bd_manager, bd. Developer is redirected to dashboard (BD-only pages). */
export const BDRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (user && isDeveloper(user)) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
