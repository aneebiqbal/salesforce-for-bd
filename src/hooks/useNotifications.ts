import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Notification, NotificationType } from '@/types'

export const NOTIFICATIONS_QUERY_KEY = ['notifications']

export const useNotifications = (userId: string | undefined) => {
  const queryClient = useQueryClient()

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, userId],
    queryFn: async (): Promise<Notification[]> => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as Notification[]
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
  })

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  })

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null)
      if (error) throw error
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY }),
  })

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return {
    notifications,
    unreadCount,
    isLoading,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllReadMutation.mutateAsync,
  }
}

export type CreateNotificationPayload = {
  user_id: string
  type: NotificationType
  title: string
  message?: string | null
  link?: string | null
}

/** Call this when admin assigns a task/lead/profile to a BD. Creates a notification for the assignee. */
export async function createNotification(payload: CreateNotificationPayload): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_id: payload.user_id,
    type: payload.type,
    title: payload.title,
    message: payload.message ?? null,
    link: payload.link ?? null,
  })
  if (error) throw error
}
