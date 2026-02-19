import { useMemo } from 'react'
import { Link } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/StatCard'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CalendarCheck, Users, Target, TrendingUp, ClipboardList } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useProfiles'
import { useActivities } from '@/hooks/useActivities'
import { useLeads } from '@/hooks/useLeads'
import { useTargets } from '@/hooks/useTargets'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

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

  const leadsChartData = useMemo(() => {
    const statusOrder = ['new', 'contacted', 'proposal', 'interview', 'negotiation', 'won', 'lost']
    return statusOrder.map((status) => ({
      status: status.replace('_', ' '),
      count: leadsByStatus[status] ?? 0,
    })).filter((d) => d.count > 0)
  }, [leadsByStatus])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">BD Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Your activity, targets, and pipeline at a glance.</p>
        </div>
        <Button asChild className="shrink-0">
          <Link to="/activities">
            <CalendarCheck className="size-4" />
            Fill today&apos;s activity
          </Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <StatCard title="My profiles" value={profiles?.length ?? 0} description="Assigned to you" icon={Users} />
            <StatCard title="My leads" value={leads?.length ?? 0} description="In pipeline" icon={ClipboardList} />
            <StatCard title="Target progress" value={`${targetProgress}%`} description="Overall this period" icon={Target} />
            <StatCard title="Today filled" value={`${filledProfileIds.size}/${profiles?.length ?? 0}`} description="Profiles with activity" icon={TrendingUp} />
          </>
        )}
      </div>

      {/* Leads by status - chart when we have data */}
      {leadsChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads by stage</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution across your pipeline.</p>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leadsChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="status" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}
                    formatter={(value) => {
                    const v = value ?? 0
                    return [`${v} lead${v !== 1 ? 's' : ''}`, 'Count']
                  }}
                  />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profiles with today's status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Today&apos;s activity by profile</CardTitle>
          <p className="text-sm text-muted-foreground">Filled = logged activity for today; unfilled = pending.</p>
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
          <CardTitle className="text-lg">Target progress</CardTitle>
          <p className="text-sm text-muted-foreground">Current period progress per metric.</p>
        </CardHeader>
        <CardContent>
          {targetsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : targets?.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No targets set. Ask your admin to assign targets.</p>
          ) : (
            <div className="space-y-5">
              {targets?.map((t) => {
                const current = currentValueByTarget.get(t.id) ?? 0
                const pct = t.target_value > 0 ? Math.min(100, Math.max(0, (current / t.target_value) * 100)) : 0
                const today = new Date().toISOString().slice(0, 10)
                const isExpired = t.end_date < today
                return (
                  <div key={t.id} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium capitalize text-foreground">{t.metric.replace(/_/g, ' ')}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {current.toLocaleString()} / {t.target_value.toLocaleString()}
                        {isExpired && <span className="ml-1.5 text-xs">(ended)</span>}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2.5" />
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads by status - badges when no chart or as summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leads by status</CardTitle>
          <p className="text-sm text-muted-foreground">Quick count per pipeline stage.</p>
        </CardHeader>
        <CardContent>
          {leadsLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : Object.keys(leadsByStatus).length === 0 ? (
            <p className="text-sm text-muted-foreground">No leads assigned to you yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(leadsByStatus).map(([status, count]) => (
                <Badge key={status} variant="secondary" className="font-medium">
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
