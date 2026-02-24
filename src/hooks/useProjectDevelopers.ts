import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ProjectDeveloper } from '@/types'

export const PROJECT_DEVELOPERS_QUERY_KEY = ['project_developers']

export const useProjectDevelopers = (projectId: string | null) => {
  const queryClient = useQueryClient()

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: [...PROJECT_DEVELOPERS_QUERY_KEY, projectId],
    queryFn: async (): Promise<ProjectDeveloper[]> => {
      if (!projectId) return []
      const { data, error } = await supabase
        .from('project_developers')
        .select('*')
        .eq('project_id', projectId)
      if (error) throw error
      return (data ?? []) as ProjectDeveloper[]
    },
    enabled: !!projectId,
    staleTime: 60 * 1000,
  })

  const addMutation = useMutation({
    mutationFn: async ({ project_id, developer_id }: { project_id: string; developer_id: string }) => {
      const { error } = await supabase.from('project_developers').insert({ project_id, developer_id })
      if (error) throw error
    },
    onSuccess: (_, { project_id }) => {
      queryClient.invalidateQueries({ queryKey: [...PROJECT_DEVELOPERS_QUERY_KEY, project_id] })
    },
  })

  const removeMutation = useMutation({
    mutationFn: async ({ project_id, developer_id }: { project_id: string; developer_id: string }) => {
      const { error } = await supabase
        .from('project_developers')
        .delete()
        .eq('project_id', project_id)
        .eq('developer_id', developer_id)
      if (error) throw error
    },
    onSuccess: (_, { project_id }) => {
      queryClient.invalidateQueries({ queryKey: [...PROJECT_DEVELOPERS_QUERY_KEY, project_id] })
    },
  })

  const syncMutation = useMutation({
    mutationFn: async ({ project_id, developer_ids }: { project_id: string; developer_ids: string[] }) => {
      const { data: current } = await supabase
        .from('project_developers')
        .select('developer_id')
        .eq('project_id', project_id)
      const currentIds = new Set((current ?? []).map((r) => r.developer_id))
      const newIds = new Set(developer_ids)
      for (const id of newIds) {
        if (!currentIds.has(id)) {
          const { error } = await supabase.from('project_developers').insert({ project_id, developer_id: id })
          if (error) throw error
        }
      }
      for (const id of currentIds) {
        if (!newIds.has(id)) {
          const { error } = await supabase
            .from('project_developers')
            .delete()
            .eq('project_id', project_id)
            .eq('developer_id', id)
          if (error) throw error
        }
      }
    },
    onSuccess: (_, { project_id }) => {
      queryClient.invalidateQueries({ queryKey: [...PROJECT_DEVELOPERS_QUERY_KEY, project_id] })
    },
  })

  return {
    developerIds: assignments.map((a) => a.developer_id),
    assignments,
    isLoading,
    addDeveloper: addMutation.mutateAsync,
    removeDeveloper: removeMutation.mutateAsync,
    syncDevelopers: syncMutation.mutateAsync,
  }
}
