import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile, ProfileWithPlatform } from '@/types'

export const PROFILES_QUERY_KEY = ['profiles']

export type ProfileInsert = Omit<Profile, 'id' | 'created_at' | 'updated_at'>

export const useProfiles = (bdMemberId?: string) => {
  const queryClient = useQueryClient()

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: [...PROFILES_QUERY_KEY, bdMemberId],
    queryFn: async (): Promise<ProfileWithPlatform[]> => {
      let q = supabase
        .from('profiles')
        .select('*, platform:platforms!platform_id(id, name, display_name, is_active, created_at)')
        .order('name')
      if (bdMemberId) q = q.eq('bd_member_id', bdMemberId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as ProfileWithPlatform[]
    },
    enabled: true,
  })

  const createMutation = useMutation({
    mutationFn: async (payload: ProfileInsert) => {
      const { data, error } = await supabase
        .from('profiles')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ProfileInsert> }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PROFILES_QUERY_KEY }),
  })

  return {
    profiles,
    isLoading,
    createProfile: createMutation.mutateAsync,
    updateProfile: updateMutation.mutateAsync,
  }
}
