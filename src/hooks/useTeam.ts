import { useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin, isBdManager } from '@/lib/roles'
import type { UserProfile } from '@/types'

export const TEAM_QUERY_KEY = ['team']

/** Team members: super_admin sees all; bd_manager sees self + their BDs (manager_id = self); bd sees only self. */
export const useTeamMembers = () => {
  const { user } = useAuth()
  const { data: allMembers = [], isLoading } = useQuery({
    queryKey: TEAM_QUERY_KEY,
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('full_name')
      if (error) throw error
      return (data ?? []) as UserProfile[]
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })

  const members = useMemo(() => {
    if (!user) return []
    if (isSuperAdmin(user)) return allMembers
    if (isBdManager(user)) {
      return allMembers.filter((m) => m.manager_id === user.id || m.id === user.id)
    }
    return allMembers.filter((m) => m.id === user.id)
  }, [user, allMembers])

  return { members, allMembers, isLoading }
}

/** Who can be assigned to (profiles, leads, tasks): super_admin = all BDs + managers; bd_manager = their BDs only, exclude self. */
export const useAssignableMembers = () => {
  const { user } = useAuth()
  const { members: teamMembers, allMembers, isLoading } = useTeamMembers()

  const members = useMemo(() => {
    if (!user) return []
    if (isSuperAdmin(user)) {
      return allMembers.filter((m) => m.role === 'bd' || m.role === 'bd_manager')
    }
    if (isBdManager(user)) {
      return teamMembers.filter((m) => m.role === 'bd' && m.id !== user.id)
    }
    return []
  }, [user, teamMembers, allMembers])

  return { members, allMembers, isLoading }
}

/** Developers that BD manager/super_admin can assign tasks to: super_admin = all developers; bd_manager = their devs (manager_id = self). */
export const useAssignableDevs = () => {
  const { user } = useAuth()
  const { allMembers, isLoading } = useTeamMembers()

  const devs = useMemo(() => {
    if (!user) return []
    if (isSuperAdmin(user)) {
      return allMembers.filter((m) => m.role === 'developer')
    }
    if (isBdManager(user)) {
      return allMembers.filter((m) => m.role === 'developer' && (m.manager_id === user.id || !m.manager_id))
    }
    return []
  }, [user, allMembers])

  return { devs, allMembers, isLoading }
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

export const useUpdateMemberManager = () => {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async ({ userId, managerId }: { userId: string; managerId: string | null }) => {
      const { error } = await supabase
        .from('user_profiles')
        .update({ manager_id: managerId, updated_at: new Date().toISOString() })
        .eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY })
    },
  })
  return {
    updateMemberManager: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  }
}
