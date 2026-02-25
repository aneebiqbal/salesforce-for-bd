import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DailyActivity } from '@/types'

export const ACTIVITIES_QUERY_KEY = ['activities']

const defaultActivityRow = {
  responses_received: 0,
  leads_created: 0,
  execution_completed: false,
  proposals_sent: 0,
  connects_used: 0,
  warmup_messages: 0,
  invites_received: 0,
  interviews: 0,
  easy_applies: 0,
  connection_requests: 0,
  direct_applies: 0,
  indeed_applies: 0,
  dms_sent: 0,
  fetched_emails: 0,
  inmail_sent: 0,
  emails_sent: 0,
  open_rate: 0,
  reply_rate: 0,
  bounced: 0,
  meetings_booked: 0,
  learning_minutes: null as number | null,
  learning_activity: null as string | null,
} as const

export type DailyActivityInsert = Omit<DailyActivity, 'id' | 'total_actions' | 'response_rate' | 'created_at' | 'updated_at'> & {
  notes?: string | null
  remarks?: string | null
}

export const useActivities = (bdMemberId?: string, start?: string, end?: string) => {
  const queryClient = useQueryClient()

  const { data: activities = [], isLoading } = useQuery({
    queryKey: [...ACTIVITIES_QUERY_KEY, bdMemberId, start, end],
    queryFn: async (): Promise<DailyActivity[]> => {
      let q = supabase
        .from('daily_activities')
        .select('*, platform:platforms!platform_id(name, display_name)')
        .order('activity_date', { ascending: false })
      if (bdMemberId) q = q.eq('bd_member_id', bdMemberId)
      if (start) q = q.gte('activity_date', start)
      if (end) q = q.lte('activity_date', end)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as DailyActivity[]
    },
    enabled: true,
    staleTime: 60 * 1000,
  })

  const createMutation = useMutation({
    mutationFn: async (payload: DailyActivityInsert) => {
      const row = {
        ...defaultActivityRow,
        ...payload,
        notes: payload.notes ?? null,
        remarks: payload.remarks ?? null,
        learning_minutes: payload.learning_minutes ?? null,
        learning_activity: payload.learning_activity?.trim() || null,
      }
      const { data, error } = await supabase
        .from('daily_activities')
        .insert(row)
        .select()
        .single()
      if (error) throw error
      return data as DailyActivity
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY }),
  })

  const upsertMutation = useMutation({
    mutationFn: async (payload: DailyActivityInsert) => {
      const row = {
        ...defaultActivityRow,
        ...payload,
        notes: payload.notes ?? null,
        remarks: payload.remarks ?? null,
        learning_minutes: payload.learning_minutes ?? null,
        learning_activity: payload.learning_activity?.trim() || null,
      }
      const { data, error } = await supabase
        .from('daily_activities')
        .upsert(row, { onConflict: 'profile_id,activity_date' })
        .select()
        .single()
      if (error) throw error
      return data as DailyActivity
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY }),
  })

  return { activities, isLoading, createActivity: createMutation.mutateAsync, upsertActivity: upsertMutation.mutateAsync, isUpserting: upsertMutation.isPending }
}

export const useActivityForProfileAndDate = (profileId: string | null, activityDate: string | null) => {
  const { data, isLoading } = useQuery({
    queryKey: [...ACTIVITIES_QUERY_KEY, 'single', profileId, activityDate],
    queryFn: async (): Promise<DailyActivity | null> => {
      if (!profileId || !activityDate) return null
      const { data: row, error } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('profile_id', profileId)
        .eq('activity_date', activityDate)
        .maybeSingle()
      if (error) throw error
      return row as DailyActivity | null
    },
    enabled: !!profileId && !!activityDate,
  })
  return { activity: data ?? null, isLoading }
}
