import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useTasks } from '@/hooks/useTasks'
import { useProfiles } from '@/hooks/useProfiles'
import { useActivities } from '@/hooks/useActivities'

/**
 * For the current BD user: pending tasks count + whether today's activity is incomplete.
 * Used for sidebar badge and BD dashboard "incomplete work" indicator.
 */
export function useIncompleteWork() {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const todayStr = new Date().toISOString().slice(0, 10)

  const { tasks } = useTasks(user?.role === 'admin' ? undefined : userId)
  const { profiles } = useProfiles(userId)
  const { activities: todayActivities } = useActivities(userId, todayStr, todayStr)

  return useMemo(() => {
    const pendingTasks = (tasks ?? []).filter((t) => !t.completed_at)
    const pendingTaskCount = pendingTasks.length
    const overdueCount = pendingTasks.filter(
      (t) => t.due_date && t.due_date < todayStr
    ).length
    const dueTodayCount = pendingTasks.filter((t) => t.due_date === todayStr).length

    const totalProfiles = profiles?.length ?? 0
    const filledProfileIds = new Set((todayActivities ?? []).map((a) => a.profile_id))
    const filledCount = filledProfileIds.size
    const allActivityDone =
      totalProfiles === 0 ||
      (filledCount === totalProfiles &&
        (todayActivities ?? []).every((a) => a.execution_completed))
    const activityIncomplete = !allActivityDone && totalProfiles > 0

    const incompleteCount = pendingTaskCount + (activityIncomplete ? 1 : 0)

    return {
      pendingTaskCount,
      overdueCount,
      dueTodayCount,
      activityIncomplete,
      totalProfiles,
      filledCount,
      allActivityDone,
      incompleteCount,
    }
  }, [tasks, profiles, todayActivities, todayStr])
}
