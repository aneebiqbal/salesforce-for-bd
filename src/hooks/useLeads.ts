import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Lead } from '@/types'

export const LEADS_QUERY_KEY = ['leads']

export type LeadInsert = Omit<Lead, 'id' | 'created_at' | 'updated_at'>

export const useLeads = (assignedTo?: string) => {
  const queryClient = useQueryClient()

  const { data: leads = [], isLoading } = useQuery({
    queryKey: [...LEADS_QUERY_KEY, assignedTo],
    queryFn: async (): Promise<Lead[]> => {
      let q = supabase
        .from('leads')
        .select('*, source_platform:platforms!source_platform_id(display_name)')
        .order('created_at', { ascending: false })
      if (assignedTo) q = q.eq('assigned_to', assignedTo)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Lead[]
    },
    enabled: true,
  })

  const createMutation = useMutation({
    mutationFn: async (payload: LeadInsert) => {
      const { data, error } = await supabase.from('leads').insert(payload).select().single()
      if (error) throw error
      return data as Lead
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<LeadInsert> }) => {
      const { data, error } = await supabase.from('leads').update(payload).eq('id', id).select().single()
      if (error) throw error
      return data as Lead
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY }),
  })

  return {
    leads,
    isLoading,
    createLead: createMutation.mutateAsync,
    updateLead: updateMutation.mutateAsync,
    deleteLead: deleteMutation.mutateAsync,
  }
}
