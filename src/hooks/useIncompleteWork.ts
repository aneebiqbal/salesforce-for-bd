import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { isSuperAdmin, isDeveloper } from '@/lib/roles'
import { useTasks } from '@/hooks/useTasks'
import { useDevTasks } from '@/hooks/useDevTasks'
import { useProfiles } from '@/hooks/useProfiles'
import { useActivities } from '@/hooks/useActivities'

/**
 * For the current BD user: pending tasks count + whether today's activity is incomplete.
 * For developer: pending dev_tasks count.
 * Used for sidebar badge and dashboard "incomplete work" indicator.
 */
export function useIncompleteWork() {
  const { user } = useAuth()
  const userId = user?.id
  const todayStr = new Date().toISOString().slice(0, 10)
  const developer = isDeveloper(user)

  const { tasks } = useTasks(isSuperAdmin(user) ? undefined : userId)
  const { tasks: devTasks } = useDevTasks(developer ? userId : undefined)
  const { profiles } = useProfiles(userId)
  const { activities: todayActivities } = useActivities(userId, todayStr, todayStr)

  return useMemo(() => {
    const sourceTasks = developer ? (devTasks ?? []) : (tasks ?? [])
    const pendingTasks = sourceTasks.filter((t) => !('completed_at' in t) || !t.completed_at)
    const pendingTaskCount = pendingTasks.length
    const overdueCount = pendingTasks.filter(
      (t) => t.due_date && t.due_date < todayStr
    ).length
    const dueTodayCount = pendingTasks.filter((t) => t.due_date === todayStr).length

    const totalProfiles = developer ? 0 : (profiles?.length ?? 0)
    const filledProfileIds = new Set((todayActivities ?? []).map((a) => a.profile_id))
    const filledCount = filledProfileIds.size
    const allActivityDone =
      developer || totalProfiles === 0 ||
      (filledCount === totalProfiles &&
        (todayActivities ?? []).every((a) => a.execution_completed))
    const activityIncomplete = !developer && !allActivityDone && totalProfiles > 0

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
  }, [tasks, devTasks, developer, profiles, todayActivities, todayStr])
}
