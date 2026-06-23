import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export const ACTIVITY_LOG_QUERY_KEY = ['activity-log']

export interface ActivityLogRow {
  id: string
  activity_date: string
  total_actions: number
  response_rate: number
  execution_completed: boolean
  bd_member_name: string
  profile_name: string
  platform_display_name: string
  learning_minutes: number | null
  learning_activity: string | null
}

const PAGE_SIZE = 20

export const useActivityLog = (
  options: {
    bdMemberId?: string | null
    startDate?: string | null
    endDate?: string | null
    platformId?: string | null
    page?: number
  } = {}
) => {
  const { user } = useAuth()
  const { bdMemberId, startDate, endDate, platformId, page = 1 } = options
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, isLoading } = useQuery({
    queryKey: [...ACTIVITY_LOG_QUERY_KEY, bdMemberId, startDate, endDate, platformId, page],
    staleTime: 60 * 1000,
    queryFn: async (): Promise<{ rows: ActivityLogRow[]; total: number }> => {
      let q = supabase
        .from('daily_activities')
        .select('id, activity_date, total_actions, response_rate, execution_completed, profile_id, bd_member_id, platform_id, learning_minutes, learning_activity', { count: 'exact' })
        .order('activity_date', { ascending: false })
        .range(from, to)

      if (bdMemberId) q = q.eq('bd_member_id', bdMemberId)
      if (startDate) q = q.gte('activity_date', startDate)
      if (endDate) q = q.lte('activity_date', endDate)
      if (platformId) q = q.eq('platform_id', platformId)

      const { data: list, error, count } = await q
      if (error) throw error

      if (!list?.length) return { rows: [], total: count ?? 0 }

      const profileIds = [...new Set(list.map((r) => r.profile_id))]
      const bdIds = [...new Set(list.map((r) => r.bd_member_id))]
      const platformIds = [...new Set(list.map((r) => r.platform_id))]

      const [profilesRes, bdRes, platformsRes] = await Promise.all([
        supabase.from('profiles').select('id, name').in('id', profileIds),
        supabase.from('user_profiles').select('id, full_name').in('id', bdIds),
        supabase.from('platforms').select('id, display_name').in('id', platformIds),
      ])

      const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.name]))
      const bdMap = new Map((bdRes.data ?? []).map((b) => [b.id, b.full_name]))
      const platformMap = new Map((platformsRes.data ?? []).map((p) => [p.id, p.display_name]))

      const rows: ActivityLogRow[] = list.map((r) => ({
        id: r.id,
        activity_date: r.activity_date as string,
        total_actions: Number(r.total_actions ?? 0),
        response_rate: Number(r.response_rate ?? 0),
        execution_completed: Boolean(r.execution_completed),
        bd_member_name: bdMap.get(r.bd_member_id) ?? '—',
        profile_name: profileMap.get(r.profile_id) ?? '—',
        platform_display_name: platformMap.get(r.platform_id) ?? '—',
        learning_minutes: r.learning_minutes != null ? Number(r.learning_minutes) : null,
        learning_activity: (r.learning_activity as string) || null,
      }))

      return { rows, total: count ?? 0 }
    },
    enabled: !!user,
  })

  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    pageSize: PAGE_SIZE,
    isLoading,
  }
}
