import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export const ACTIVITY_TREND_QUERY_KEY = ['admin', 'activity-trend']

export const useActivityTrend = (days = 7) => {
  const { user } = useAuth()
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  const startStr = start.toISOString().slice(0, 10)
  const endStr = end.toISOString().slice(0, 10)

  const { data = [], isLoading } = useQuery({
    queryKey: [...ACTIVITY_TREND_QUERY_KEY, startStr, endStr],
    queryFn: async (): Promise<{ date: string; value: number }[]> => {
      const { data: rows, error } = await supabase
        .from('daily_activities')
        .select('activity_date, total_actions')
        .gte('activity_date', startStr)
        .lte('activity_date', endStr)

      if (error) throw error

      const byDate: Record<string, number> = {}
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10)
        byDate[key] = 0
      }
      for (const r of rows ?? []) {
        const key = r.activity_date as string
        byDate[key] = (byDate[key] ?? 0) + Number(r.total_actions ?? 0)
      }
      return Object.entries(byDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, value]) => ({ date, value }))
    },
    enabled: !!user,
  })

  return { data, isLoading }
}
