import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DevTask } from '@/types'

export type DevTaskInsert = Omit<DevTask, 'id' | 'created_at' | 'updated_at'>
export type DevTaskUpdate = Partial<Omit<DevTask, 'id' | 'created_at' | 'updated_at'>> & { id: string }

export const DEV_TASKS_QUERY_KEY = ['dev_tasks']

export const useDevTasks = (devId?: string) => {
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: [...DEV_TASKS_QUERY_KEY, devId],
    queryFn: async (): Promise<DevTask[]> => {
      let q = supabase
        .from('dev_tasks')
        .select('*')
        .order('due_date', { ascending: true })
        .order('due_time', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (devId) q = q.eq('dev_id', devId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as DevTask[]
    },
    enabled: true,
    staleTime: 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: async (payload: DevTaskInsert) => {
      const { data, error } = await supabase.from('dev_tasks').insert(payload).select().single()
      if (error) throw error
      return data as DevTask
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: DEV_TASKS_QUERY_KEY }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...rest }: DevTaskUpdate) => {
      const { data, error } = await supabase
        .from('dev_tasks')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as DevTask
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: DEV_TASKS_QUERY_KEY }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dev_tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: DEV_TASKS_QUERY_KEY }),
  })

  const toggleComplete = async (task: DevTask) => {
    const completed_at = task.completed_at ? null : new Date().toISOString()
    return updateMutation.mutateAsync({ id: task.id, completed_at })
  }

  return {
    tasks,
    isLoading,
    createTask: createMutation.mutateAsync,
    updateTask: updateMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync,
    toggleComplete,
  }
}
