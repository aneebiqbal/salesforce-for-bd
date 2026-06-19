import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskRepeat = 'none' | 'daily' | 'weekly' | 'monthly'

export interface Task {
  id: string
  bd_member_id: string
  title: string
  description: string | null
  priority: TaskPriority
  repeat: TaskRepeat
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at'>
export type TaskUpdate = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>> & { id: string }

export const TASKS_QUERY_KEY = ['tasks']

export const useTasks = (bdMemberId?: string) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: [...TASKS_QUERY_KEY, bdMemberId],
    queryFn: async (): Promise<Task[]> => {
      let q = supabase
        .from('tasks')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })
      if (bdMemberId) q = q.eq('bd_member_id', bdMemberId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as Task[]
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: async (payload: TaskInsert) => {
      const { data, error } = await supabase.from('tasks').insert(payload).select().single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...rest }: TaskUpdate) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Task
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY }),
  })

  const toggleComplete = async (task: Task) => {
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
