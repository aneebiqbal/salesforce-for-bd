import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Target } from '@/types'

export const TARGETS_QUERY_KEY = ['targets']

export type TargetInsert = Omit<Target, 'id' | 'created_at'>
export type TargetUpdate = Partial<TargetInsert> & { id: string }

export const useTargets = (bdMemberId?: string) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: targets = [], isLoading } = useQuery({
    queryKey: [...TARGETS_QUERY_KEY, bdMemberId],
    queryFn: async (): Promise<Target[]> => {
      let q = supabase
        .from('targets')
        .select('*')
        .order('start_date', { ascending: false })
      if (bdMemberId) q = q.eq('bd_member_id', bdMemberId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Target[]
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })

  const upsertMutation = useMutation({
    mutationFn: async (payload: TargetInsert | TargetUpdate) => {
      const isUpdate = 'id' in payload && payload.id
      if (isUpdate) {
        const { id, ...rest } = payload as TargetUpdate
        const { data, error } = await supabase.from('targets').update(rest).eq('id', id).select().single()
        if (error) throw error
        return data as Target
      }
      const { data, error } = await supabase.from('targets').insert(payload as TargetInsert).select().single()
      if (error) throw error
      return data as Target
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TARGETS_QUERY_KEY }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('targets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TARGETS_QUERY_KEY }),
  })

  return { targets, isLoading, upsertTarget: upsertMutation.mutateAsync, deleteTarget: deleteMutation.mutateAsync }
}
