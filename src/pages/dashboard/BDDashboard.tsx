import { useMemo } from 'react'
import { Link } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/StatCard'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useProfiles'
import { useActivities } from '@/hooks/useActivities'
import { useLeads } from '@/hooks/useLeads'
import { useTargets } from '@/hooks/useTargets'

// Stable date range constants for target progress calculation
const _now = new Date()
const YEAR_START = new Date(_now.getFullYear(), 0, 1).toISOString().slice(0, 10)
const YEAR_END = new Date(_now.getFullYear(), 11, 31).toISOString().slice(0, 10)

export const BDDashboard = () => {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const today = new Date().toISOString().slice(0, 10)

  const { profiles, isLoading: profilesLoading } = useProfiles(userId)
  const { activities: todayActivities, isLoading: activitiesLoading } = useActivities(userId, today, today)
  // Fetch activities for the current year to calculate target progress
  const { activities: allActivities } = useActivities(userId, YEAR_START, YEAR_END)
  const { leads, isLoading: leadsLoading } = useLeads(userId)
  const { targets, isLoading: targetsLoading } = useTargets(userId)

  const filledProfileIds = new Set((todayActivities ?? []).map((a) => a.profile_id))
  const leadsByStatus = (leads ?? []).reduce((acc, l) => {
    acc[l.status] = (acc[l.status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const currentValueByTarget = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of targets ?? []) {
      const relevant = (allActivities ?? []).filter(
        (a) =>
          a.bd_member_id === t.bd_member_id &&
          a.activity_date >= t.start_date &&
          a.activity_date <= t.end_date
      )
      const sum = relevant.reduce(
        (s, a) => s + Number((a as unknown as Record<string, number>)[t.metric] ?? 0),
        0
      )
      map.set(t.id, sum)
    }
    return map
  }, [targets, allActivities])

  const totalTarget = (targets ?? []).reduce((s, t) => s + t.target_value, 0)
  const totalCurrent = (targets ?? []).reduce((s, t) => s + (currentValueByTarget.get(t.id) ?? 0), 0)
  const targetProgress = totalTarget > 0 ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100)) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">BD Dashboard</h1>
          <p className="text-muted-foreground">Your activity and targets.</p>
        </div>
        <Button asChild>
          <Link to="/activities">
            <CalendarCheck className="size-4" />
            Fill Today&apos;s Activity
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {profilesLoading || leadsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard title="My Profiles" value={profiles?.length ?? 0} description="Assigned to you" />
            <StatCard title="My Leads" value={leads?.length ?? 0} description="Assigned to you" />
            <StatCard title="Target Progress" value={`${targetProgress}%`} description="Overall" />
            <StatCard title="Today Filled" value={`${filledProfileIds.size}/${profiles?.length ?? 0}`} description="Profiles with activity" />
          </>
        )}
      </div>

      {/* Profiles with today's status */}
      <Card>
        <CardHeader>
          <CardTitle>My Profiles – Today&apos;s Activity</CardTitle>
          <p className="text-sm text-muted-foreground">Green = filled for today, gray = not filled.</p>
        </CardHeader>
        <CardContent>
          {profilesLoading || activitiesLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : profiles?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No profiles assigned. Ask admin to add profiles.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profiles?.map((p) => {
                const filled = filledProfileIds.has(p.id)
                return (
                  <Badge key={p.id} variant={filled ? 'default' : 'secondary'}>
                    {p.name} {filled ? '✓' : '—'}
                  </Badge>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Target progress bars */}
      <Card>
        <CardHeader>
          <CardTitle>Target Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {targetsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : targets?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No targets set.</p>
          ) : (
            <div className="space-y-4">
              {targets?.map((t) => {
                const current = currentValueByTarget.get(t.id) ?? 0
                const pct = t.target_value > 0 ? Math.min(100, Math.max(0, (current / t.target_value) * 100)) : 0
                const today = new Date().toISOString().slice(0, 10)
                const isExpired = t.end_date < today
                return (
                  <div key={t.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{t.metric.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">
                        {current} / {t.target_value}
                        {isExpired && <span className="ml-1 text-xs">(expired)</span>}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads by status */}
      <Card>
        <CardHeader>
          <CardTitle>My Leads by Status</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : Object.keys(leadsByStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads assigned.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(leadsByStatus).map(([status, count]) => (
                <Badge key={status} variant="outline">
                  {status.replace('_', ' ')}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
