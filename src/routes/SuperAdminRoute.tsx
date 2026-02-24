import { Navigate } from 'react-router'
import { useAuth } from '@/hooks/useAuth'

export const SuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }
  if (user?.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />
  }
  return <>{children}</>
}
