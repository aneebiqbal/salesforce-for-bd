import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DevAttendance } from '@/types'

export const DEV_ATTENDANCE_QUERY_KEY = ['dev_attendance']

export const useDevAttendance = (devId: string | undefined, date: string) => {
  const queryClient = useQueryClient()

  const { data: record, isLoading } = useQuery({
    queryKey: [...DEV_ATTENDANCE_QUERY_KEY, devId, date],
    queryFn: async (): Promise<DevAttendance | null> => {
      if (!devId || !date) return null
      const { data, error } = await supabase
        .from('dev_attendance')
        .select('*')
        .eq('dev_id', devId)
        .eq('attendance_date', date)
        .maybeSingle()
      if (error) throw error
      return (data ?? null) as DevAttendance | null
    },
    enabled: !!devId && !!date,
    staleTime: 30 * 1000,
  })

  const upsertMutation = useMutation({
    mutationFn: async ({
      dev_id,
      attendance_date,
      check_in_at,
      check_out_at,
    }: {
      dev_id: string
      attendance_date: string
      check_in_at?: string | null
      check_out_at?: string | null
    }) => {
      const { data, error } = await supabase
        .from('dev_attendance')
        .upsert(
          { dev_id, attendance_date, check_in_at, check_out_at, updated_at: new Date().toISOString() },
          { onConflict: 'dev_id,attendance_date' }
        )
        .select()
        .single()
      if (error) throw error
      return data as DevAttendance
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: DEV_ATTENDANCE_QUERY_KEY }),
  })

  const checkIn = async () => {
    if (!devId || !date) return
    const now = new Date().toISOString()
    const existing = record
    await upsertMutation.mutateAsync({
      dev_id: devId,
      attendance_date: date,
      check_in_at: now,
      check_out_at: existing?.check_out_at ?? null,
    })
  }

  const checkOut = async () => {
    if (!devId || !date) return
    const now = new Date().toISOString()
    await upsertMutation.mutateAsync({
      dev_id: devId,
      attendance_date: date,
      check_in_at: record?.check_in_at ?? null,
      check_out_at: now,
    })
  }

  return {
    record: record ?? null,
    isLoading,
    checkIn,
    checkOut,
    isCheckedIn: !!record?.check_in_at && !record?.check_out_at,
  }
}

/** List attendance for a dev or for all team devs (manager) in a date range */
export const useDevAttendanceList = (devId: string | undefined, startDate: string, endDate: string) => {
  const { data: list = [], isLoading } = useQuery({
    queryKey: [...DEV_ATTENDANCE_QUERY_KEY, 'list', devId, startDate, endDate],
    queryFn: async (): Promise<DevAttendance[]> => {
      let q = supabase
        .from('dev_attendance')
        .select('*')
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .order('attendance_date', { ascending: false })
      if (devId) q = q.eq('dev_id', devId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as DevAttendance[]
    },
    enabled: !!startDate && !!endDate,
    staleTime: 60 * 1000,
  })
  return { list, isLoading }
}
