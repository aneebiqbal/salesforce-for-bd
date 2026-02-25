import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ACTIVITIES_QUERY_KEY } from '@/hooks/useActivities'
import { TODAY_TEAM_STATUS_QUERY_KEY } from '@/hooks/useTodayTeamStatus'

export const CHECK_IN_QUERY_KEY = ['check-in']

export interface CheckInStatus {
  checkInTime: string | null
  checkOutTime: string | null
}

export const useCheckInStatus = (bdMemberId: string | undefined, activityDate: string) => {
  const { data, isLoading } = useQuery({
    queryKey: [...CHECK_IN_QUERY_KEY, bdMemberId, activityDate],
    queryFn: async (): Promise<CheckInStatus> => {
      if (!bdMemberId) return { checkInTime: null, checkOutTime: null }
      const { data: row, error } = await supabase
        .from('daily_activities')
        .select('check_in_time, check_out_time')
        .eq('bd_member_id', bdMemberId)
        .eq('activity_date', activityDate)
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return {
        checkInTime: (row?.check_in_time as string | null) ?? null,
        checkOutTime: (row?.check_out_time as string | null) ?? null,
      }
    },
    enabled: !!bdMemberId && !!activityDate,
  })
  return {
    checkInTime: data?.checkInTime ?? null,
    checkOutTime: data?.checkOutTime ?? null,
    isLoading,
  }
}

export const useCheckIn = (bdMemberId: string | undefined, activityDate: string, firstProfileId: string | undefined, platformId: string | undefined) => {
  const queryClient = useQueryClient()

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!bdMemberId) throw new Error('Not authenticated')
      const now = new Date().toISOString()

      // Check-in should NOT create a new activity row — it only records the timestamp.
      // Activity data (metrics) is created/updated through the quick-fill sheet.
      const { data: existing } = await supabase
        .from('daily_activities')
        .select('id')
        .eq('bd_member_id', bdMemberId)
        .eq('activity_date', activityDate)
        .limit(1)
        .maybeSingle()

      if (existing) {
        // Update check_in_time on all rows for this member/date
        const { error } = await supabase
          .from('daily_activities')
          .update({ check_in_time: now })
          .eq('bd_member_id', bdMemberId)
          .eq('activity_date', activityDate)
        if (error) throw error
      } else {
        // No activity rows yet — create a minimal placeholder so check_in_time
        // is persisted. The BD member fills metrics later via the quick-fill sheet.
        // Using upsert to avoid duplicate key errors on concurrent calls.
        if (!firstProfileId || !platformId) throw new Error('No profile to attach check-in')
        const { error } = await supabase.from('daily_activities').upsert({
          profile_id: firstProfileId,
          bd_member_id: bdMemberId,
          platform_id: platformId,
          activity_date: activityDate,
          check_in_time: now,
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
        }, { onConflict: 'profile_id,activity_date' })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHECK_IN_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY })
    },
  })

  const checkOutMutation = useMutation({
    mutationFn: async () => {
      if (!bdMemberId) throw new Error('Not authenticated')
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('daily_activities')
        .update({ check_out_time: now })
        .eq('bd_member_id', bdMemberId)
        .eq('activity_date', activityDate)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHECK_IN_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY })
    },
  })

  const autoCheckOutPreviousSession = useMutation({
    mutationFn: async () => {
      if (!bdMemberId) return
      const today = new Date().toISOString().slice(0, 10)
      const { data: unclosed } = await supabase
        .from('daily_activities')
        .select('activity_date, updated_at')
        .eq('bd_member_id', bdMemberId)
        .lt('activity_date', today)
        .not('check_in_time', 'is', null)
        .is('check_out_time', null)
        .order('activity_date', { ascending: false })
        .limit(100)
      if (!unclosed?.length) return
      const byDate = new Map<string, string>()
      for (const row of unclosed) {
        const d = row.activity_date as string
        const u = (row.updated_at as string) ?? ''
        if (!byDate.has(d) || u > (byDate.get(d) ?? '')) byDate.set(d, u)
      }
      for (const [activityDate, lastUpdated] of byDate) {
        await supabase
          .from('daily_activities')
          .update({ check_out_time: lastUpdated })
          .eq('bd_member_id', bdMemberId)
          .eq('activity_date', activityDate)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHECK_IN_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY })
    },
  })

  return {
    checkIn: checkInMutation.mutateAsync,
    checkOut: checkOutMutation.mutateAsync,
    isCheckingIn: checkInMutation.isPending,
    isCheckingOut: checkOutMutation.isPending,
    autoCheckOutPreviousSession: autoCheckOutPreviousSession.mutateAsync,
  }
}

/** Admin/manager: clear check-out (undo mistaken check-out) or clear both check-in and check-out for a member on a date. */
export const useClearCheckInForMember = () => {
  const queryClient = useQueryClient()

  const clearCheckOutMutation = useMutation({
    mutationFn: async ({ bdMemberId, activityDate }: { bdMemberId: string; activityDate: string }) => {
      const { error } = await supabase
        .from('daily_activities')
        .update({ check_out_time: null })
        .eq('bd_member_id', bdMemberId)
        .eq('activity_date', activityDate)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHECK_IN_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TODAY_TEAM_STATUS_QUERY_KEY })
    },
  })

  const clearCheckInAndCheckOutMutation = useMutation({
    mutationFn: async ({ bdMemberId, activityDate }: { bdMemberId: string; activityDate: string }) => {
      const { error } = await supabase
        .from('daily_activities')
        .update({ check_in_time: null, check_out_time: null })
        .eq('bd_member_id', bdMemberId)
        .eq('activity_date', activityDate)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHECK_IN_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ACTIVITIES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: TODAY_TEAM_STATUS_QUERY_KEY })
    },
  })

  return {
    clearCheckOut: clearCheckOutMutation.mutateAsync,
    clearCheckInAndCheckOut: clearCheckInAndCheckOutMutation.mutateAsync,
    isClearing: clearCheckOutMutation.isPending || clearCheckInAndCheckOutMutation.isPending,
  }
}
