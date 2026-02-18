import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

export const USER_PROFILES_QUERY_KEY = ['user-profiles']

export const useUserProfiles = (role?: 'admin' | 'bd_manager' | 'staff') => {
  const { data: users = [], isLoading } = useQuery({
    queryKey: [...USER_PROFILES_QUERY_KEY, role],
    queryFn: async (): Promise<UserProfile[]> => {
      let q = supabase.from('user_profiles').select('*').order('full_name')
      if (role) q = q.eq('role', role)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as UserProfile[]
    },
    enabled: true,
  })
  return { users, isLoading }
}
