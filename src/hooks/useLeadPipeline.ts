import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export const LEAD_PIPELINE_QUERY_KEY = ['admin', 'lead-pipeline']

const STATUS_ORDER = ['new', 'contacted', 'proposal', 'interview', 'negotiation', 'won', 'lost'] as const

export const useLeadPipeline = () => {
  const { user } = useAuth()
  const { data = [], isLoading } = useQuery({
    queryKey: LEAD_PIPELINE_QUERY_KEY,
    queryFn: async (): Promise<{ stage: string; count: number }[]> => {
      const { data: leads, error } = await supabase.from('leads').select('status')
      if (error) throw error

      const counts: Record<string, number> = {}
      for (const s of STATUS_ORDER) counts[s] = 0
      for (const l of leads ?? []) {
        const s = l.status as string
        counts[s] = (counts[s] ?? 0) + 1
      }
      return STATUS_ORDER.map((stage) => ({
        stage: stage.replace('_', ' '),
        count: counts[stage] ?? 0,
      }))
    },
    enabled: !!user,
  })

  return { data, isLoading }
}
