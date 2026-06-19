import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export const ADMIN_STATS_QUERY_KEY = ['admin', 'stats']

export interface AdminStats {
  bdMembersCount: number | null
  activeProfilesCount: number | null
  leadsThisMonthCount: number | null
  totalRevenue: number | null
}

export const useAdminStats = () => {
  const { user } = useAuth()
  const { data, isLoading } = useQuery({
    queryKey: ADMIN_STATS_QUERY_KEY,
    queryFn: async (): Promise<AdminStats> => {
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)
      const monthStart = startOfMonth.toISOString().slice(0, 10)

      // Run all queries independently so one failure doesn't crash the whole dashboard
      const [bdRes, profilesRes, leadsRes, projectsRes] = await Promise.allSettled([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('role', 'bd_manager'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('projects').select('revenue').in('status', ['active', 'completed']),
      ])

      const bdCount = bdRes.status === 'fulfilled' ? (bdRes.value.count ?? 0) : null
      const profilesCount = profilesRes.status === 'fulfilled' ? (profilesRes.value.count ?? 0) : null
      const leadsCount = leadsRes.status === 'fulfilled' ? (leadsRes.value.count ?? 0) : null
      const projectData = projectsRes.status === 'fulfilled' ? (projectsRes.value.data ?? []) : null
      const totalRevenue = projectData
        ? projectData.reduce((sum, p) => sum + Number(p.revenue ?? 0), 0)
        : null

      return {
        bdMembersCount: bdCount,
        activeProfilesCount: profilesCount,
        leadsThisMonthCount: leadsCount,
        totalRevenue,
      }
    },
    enabled: !!user,
  })

  return { stats: data ?? null, isLoading }
}
