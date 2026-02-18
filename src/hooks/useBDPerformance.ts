import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const BD_PERFORMANCE_QUERY_KEY = ['admin', 'bd-performance']

export interface BDPerformanceRow {
  bd_member_id: string
  bd_member_name: string
  bd_member_email: string
  total_activity_entries: number
  total_responses_received: number
  total_leads_created: number
  total_proposals_sent: number
  total_easy_applies: number
  total_emails_sent: number
  total_actions: number
  response_rate: number
}

export const useBDPerformance = () => {
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const monthStart = startOfMonth.toISOString().slice(0, 10)

  const { data: rows = [], isLoading } = useQuery({
    queryKey: [...BD_PERFORMANCE_QUERY_KEY, monthStart],
    queryFn: async (): Promise<BDPerformanceRow[]> => {
      const { data: activities, error: actErr } = await supabase
        .from('daily_activities')
        .select('bd_member_id, total_actions, responses_received, leads_created, proposals_sent, easy_applies, emails_sent')
        .gte('activity_date', monthStart)
      if (actErr) throw actErr

      const { data: profiles } = await supabase.from('user_profiles').select('id, full_name, email').in('role', ['admin', 'bd_manager'])
      const byMember: Record<string, BDPerformanceRow> = {}
      for (const p of profiles ?? []) {
        byMember[p.id] = {
          bd_member_id: p.id,
          bd_member_name: p.full_name ?? '',
          bd_member_email: p.email ?? '',
          total_activity_entries: 0,
          total_responses_received: 0,
          total_leads_created: 0,
          total_proposals_sent: 0,
          total_easy_applies: 0,
          total_emails_sent: 0,
          total_actions: 0,
          response_rate: 0,
        }
      }
      for (const a of activities ?? []) {
        const id = a.bd_member_id as string
        if (!byMember[id]) continue
        byMember[id].total_activity_entries += 1
        byMember[id].total_responses_received += Number(a.responses_received ?? 0)
        byMember[id].total_leads_created += Number(a.leads_created ?? 0)
        byMember[id].total_proposals_sent += Number(a.proposals_sent ?? 0)
        byMember[id].total_easy_applies += Number(a.easy_applies ?? 0)
        byMember[id].total_emails_sent += Number(a.emails_sent ?? 0)
        byMember[id].total_actions += Number(a.total_actions ?? 0)
      }
      for (const row of Object.values(byMember)) {
        row.response_rate = row.total_actions > 0 ? row.total_responses_received / row.total_actions : 0
      }
      return Object.values(byMember).filter((r) => r.bd_member_name)
    },
    enabled: true,
  })

  return { data: rows, isLoading }
}
