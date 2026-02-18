import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { UserProfile } from '@/types'

export const TEAM_QUERY_KEY = ['team']

export const useTeamMembers = () => {
  const { data: members = [], isLoading } = useQuery({
    queryKey: TEAM_QUERY_KEY,
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('full_name')
      if (error) throw error
      return (data ?? []) as UserProfile[]
    },
    enabled: true,
  })
  return { members, isLoading }
}

/** Members that can be assigned as BD (admin or bd_manager) */
export const useAssignableMembers = () => {
  const { members, isLoading } = useTeamMembers()
  const assignable = members.filter((m) => m.role === 'admin' || m.role === 'bd_manager')
  return { members: assignable, allMembers: members, isLoading }
}

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: UserProfile['role'] }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY })
    },
  })
  return {
    updateMemberRole: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  }
}

export const useToggleMemberActive = () => {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY })
    },
  })
  return {
    toggleMemberActive: mutation.mutateAsync,
    isToggling: mutation.isPending,
  }
}
