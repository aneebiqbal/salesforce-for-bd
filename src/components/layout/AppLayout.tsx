import { useMemo } from 'react'
import { Outlet } from 'react-router'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { AICoachPanel } from '@/components/ai/AICoachPanel'
import { useAuthContext } from '@/providers/AuthProvider'
import { useProfiles } from '@/hooks/useProfiles'
import { useActivities } from '@/hooks/useActivities'
import { useLeads } from '@/hooks/useLeads'
import { useTargets } from '@/hooks/useTargets'
import type { BDContext } from '@/hooks/useAICoach'

export const AppLayout = () => {
  const { user } = useAuthContext()
  const userId = user?.id
  const today = new Date().toISOString().slice(0, 10)

  const { profiles } = useProfiles(userId)
  const { activities: todayActivities } = useActivities(userId, today, today)
  const { leads } = useLeads(userId)
  const { targets } = useTargets(userId)

  const aiContext = useMemo((): BDContext | null => {
    if (!user) return null

    const filledToday = new Set(todayActivities.map((a) => a.profile_id)).size
    const totalActionsToday = todayActivities.reduce((s, a) => s + (a.total_actions ?? 0), 0)

    const platformCounts: Record<string, number> = {}
    for (const a of todayActivities) {
      const name = a.platform?.display_name ?? 'Unknown'
      platformCounts[name] = (platformCounts[name] ?? 0) + 1
    }
    const platformsSummary =
      Object.entries(platformCounts)
        .map(([p, c]) => `${p} (${c})`)
        .join(', ') || 'None today'

    const now = new Date().toISOString().slice(0, 10)
    const activeTargets = targets
      .filter((t) => t.start_date <= now && t.end_date >= now)
      .map((t) => {
        const relevant = todayActivities.filter((a) => a.bd_member_id === t.bd_member_id)
        const current = relevant.reduce(
          (s, a) => s + Number((a as unknown as Record<string, unknown>)[t.metric] ?? 0),
          0
        )
        const pct = t.target_value > 0 ? (current / t.target_value) * 100 : 0
        return { metric: t.metric, current, target: t.target_value, pct }
      })

    return {
      memberName: user.full_name,
      role: user.role,
      todayDate: today,
      profilesCount: profiles.length,
      filledToday,
      totalActionsToday,
      leadsCount: leads.length,
      activeTargets,
      platformsSummary,
    }
  }, [user, profiles, todayActivities, leads, targets, today])

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto bg-muted/30 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
      <AICoachPanel context={aiContext} />
    </div>
  )
}
