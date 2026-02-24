import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { DailyActivity } from '@/types'

export const TODAY_TEAM_STATUS_QUERY_KEY = ['today-team-status']

export interface TodayTeamStatusRow {
  bd_member_id: string
  bd_name: string
  checked_in: boolean
  profiles_filled: number
  total_profiles: number
  last_activity_time: string | null
  activities: (DailyActivity & { profile?: { name: string } | null; platform?: { display_name: string } | null })[]
}

export const useTodayTeamStatus = () => {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const { data: rawRows = [], isLoading } = useQuery({
    queryKey: [...TODAY_TEAM_STATUS_QUERY_KEY, today, user?.id, user?.role],
    queryFn: async (): Promise<TodayTeamStatusRow[]> => {
      const { data: allUsers, error: e0 } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, manager_id')
        .in('role', ['super_admin', 'bd_manager', 'bd'])
      if (e0) throw e0
      if (!allUsers?.length) return []

      let bdUsers = allUsers as { id: string; full_name: string; role: string; manager_id: string | null }[]
      if (user?.role === 'bd_manager') {
        bdUsers = bdUsers.filter((u) => u.manager_id === user.id || u.id === user.id)
      } else if (user?.role === 'bd') {
        bdUsers = bdUsers.filter((u) => u.id === user.id)
      }

      const ids = bdUsers.map((u) => u.id)

      const { data: profileCounts, error: e1 } = await supabase
        .from('profiles')
        .select('bd_member_id')
        .eq('status', 'active')
        .in('bd_member_id', ids)
      if (e1) throw e1
      const totalByBd = new Map<string, number>()
      for (const p of profileCounts ?? []) {
        totalByBd.set(p.bd_member_id, (totalByBd.get(p.bd_member_id) ?? 0) + 1)
      }

      const { data: activities, error: e2 } = await supabase
        .from('daily_activities')
        .select('*, profile:profiles!profile_id(name), platform:platforms!platform_id(display_name)')
        .eq('activity_date', today)
        .in('bd_member_id', ids)
      if (e2) throw e2
      const list = (activities ?? []) as (DailyActivity & { profile?: { name: string } | null; platform?: { display_name: string } | null })[]

      const byBd = new Map<string, DailyActivity[]>()
      for (const a of list) {
        const arr = byBd.get(a.bd_member_id) ?? []
        arr.push(a)
        byBd.set(a.bd_member_id, arr)
      }

      return bdUsers.map((u) => {
        const bdActivities = byBd.get(u.id) ?? []
        const totalProfiles = totalByBd.get(u.id) ?? 0
        const filled = bdActivities.length
        const checkedIn = bdActivities.some((a) => a.check_in_time != null)
        const lastTime =
          bdActivities.length > 0
            ? bdActivities.reduce(
                (max, a) => (a.updated_at && (!max || a.updated_at > max) ? a.updated_at : max),
                ''
              )
            : null
        return {
          bd_member_id: u.id,
          bd_name: (u.full_name as string) || '—',
          checked_in: checkedIn,
          profiles_filled: filled,
          total_profiles: totalProfiles,
          last_activity_time: lastTime || null,
          activities: bdActivities,
        }
      })
    },
    enabled: !!user,
  })
  return { rows: rawRows, isLoading }
}
