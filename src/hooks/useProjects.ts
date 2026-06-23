import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Project } from '@/types'

export const PROJECTS_QUERY_KEY = ['projects']

export type ProjectInsert = Omit<Project, 'id' | 'created_at' | 'updated_at'>
export type ProjectUpdate = Partial<ProjectInsert> & { id: string }

export const useProjects = (leadId?: string | null) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: projects = [], isLoading } = useQuery({
    queryKey: [...PROJECTS_QUERY_KEY, leadId],
    queryFn: async (): Promise<Project[]> => {
      let q = supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (leadId != null) q = q.eq('lead_id', leadId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Project[]
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: async (payload: ProjectInsert) => {
      const { data, error } = await supabase
        .from('projects')
        .insert(payload)
        .select()
        .single()
      if (error) throw error
      return data as Project
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: ProjectUpdate) => {
      const { id, ...rest } = payload
      const { data, error } = await supabase.from('projects').update(rest).eq('id', id).select().single()
      if (error) throw error
      return data as Project
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY }),
  })

  return {
    projects,
    isLoading,
    createProject: createMutation.mutateAsync,
    updateProject: updateMutation.mutateAsync,
    deleteProject: deleteMutation.mutateAsync,
  }
}
