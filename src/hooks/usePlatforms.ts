import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Platform } from '@/types'

export const PLATFORMS_QUERY_KEY = ['platforms']

export const usePlatforms = () => {
  const { data: platforms = [], isLoading } = useQuery({
    queryKey: PLATFORMS_QUERY_KEY,
    queryFn: async (): Promise<Platform[]> => {
      const { data, error } = await supabase
        .from('platforms')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return (data ?? []) as Platform[]
    },
    enabled: true,
  })
  return { platforms, isLoading }
}
