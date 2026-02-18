import { useAuthContext } from '@/providers/AuthProvider'

/** Re-export auth context for backward compatibility. Use useAuthContext in new code. */
export const useAuth = () => {
  const ctx = useAuthContext()
  return {
    ...ctx,
    isAuthenticated: !!ctx.user,
    isLoading: ctx.loading,
  }
}
