import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export const RECENT_ACTIVITIES_QUERY_KEY = ['admin', 'recent-activities']

export interface RecentActivityRow {
  id: string
  activity_date: string
  total_actions: number
  response_rate: number
  execution_completed: boolean
  bd_member_name: string
  platform_display_name: string
  profile_name: string
}

export const useRecentActivities = (limit = 10) => {
  const { user } = useAuth()
  const { data = [], isLoading } = useQuery({
    queryKey: [...RECENT_ACTIVITIES_QUERY_KEY, limit],
    queryFn: async (): Promise<RecentActivityRow[]> => {
      const { data: viewData, error } = await supabase
        .from('v_daily_activity_summary')
        .select('id, activity_date, total_actions, response_rate, execution_completed, bd_member_name, platform_display_name, profile_name')
        .order('activity_date', { ascending: false })
        .limit(limit)

      if (error) {
        const { data: activities, error: actErr } = await supabase
          .from('daily_activities')
          .select(`
            id,
            activity_date,
            total_actions,
            response_rate,
            execution_completed,
            profile_id,
            bd_member_id,
            platform_id,
            profiles!inner(name),
            user_profiles!bd_member_id(full_name),
            platforms!platform_id(display_name)
          `)
          .order('activity_date', { ascending: false })
          .limit(limit)

        if (actErr) throw actErr

        return (activities ?? []).map((a: Record<string, unknown>) => ({
          id: a.id as string,
          activity_date: a.activity_date as string,
          total_actions: Number(a.total_actions ?? 0),
          response_rate: Number(a.response_rate ?? 0),
          execution_completed: Boolean(a.execution_completed),
          bd_member_name: (a.user_profiles as { full_name?: string } | null)?.full_name ?? '—',
          platform_display_name: (a.platforms as { display_name?: string } | null)?.display_name ?? '—',
          profile_name: (a.profiles as { name?: string } | null)?.name ?? '—',
        }))
      }

      return (viewData ?? []).map((r) => ({
        id: r.id as string,
        activity_date: r.activity_date as string,
        total_actions: Number(r.total_actions ?? 0),
        response_rate: Number(r.response_rate ?? 0),
        execution_completed: Boolean(r.execution_completed),
        bd_member_name: (r as { bd_member_name?: string }).bd_member_name ?? '—',
        platform_display_name: (r as { platform_display_name?: string }).platform_display_name ?? '—',
        profile_name: (r as { profile_name?: string }).profile_name ?? '—',
      }))
    },
    enabled: !!user,
  })

  return { data, isLoading }
}
