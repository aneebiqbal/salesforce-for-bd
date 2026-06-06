import { useMemo } from 'react'
import { Link } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CalendarCheck, CheckCircle2, Circle, Clock, TrendingUp,
  Target, Users, ChevronRight, AlertTriangle, Bell,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useProfiles'
import { useActivities } from '@/hooks/useActivities'
import { useLeads } from '@/hooks/useLeads'
import { useTargets } from '@/hooks/useTargets'
import { useTasks } from '@/hooks/useTasks'
import { useIncompleteWork } from '@/hooks/useIncompleteWork'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// Stable date range constants for target progress calculation
const _now = new Date()
const YEAR_START = new Date(_now.getFullYear(), 0, 1).toISOString().slice(0, 10)
const YEAR_END = new Date(_now.getFullYear(), 11, 31).toISOString().slice(0, 10)

const STATUS_LABELS: Record<string, string> = {
  new: 'New', contacted: 'Contacted', proposal: 'Proposal Sent',
  interview: 'In Interview', negotiation: 'Negotiating', won: 'Won', lost: 'Lost',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  contacted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  proposal: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  interview: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  negotiation: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  won: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

export const BDDashboard = () => {
  const { user } = useAuth()
  const userId = user?.id
  const todayStr = new Date().toISOString().slice(0, 10)

  const { profiles, isLoading: profilesLoading } = useProfiles(userId)
  const { activities: todayActivities, isLoading: activitiesLoading } = useActivities(userId, todayStr, todayStr)
  const { activities: allActivities } = useActivities(userId, YEAR_START, YEAR_END)
  const { leads, isLoading: leadsLoading } = useLeads(userId)
  const { targets, isLoading: targetsLoading } = useTargets(userId)
  const { tasks } = useTasks(userId)
  const incomplete = useIncompleteWork()
  const { unreadCount } = useNotifications(userId)

  const filledProfileIds = useMemo(
    () => new Set((todayActivities ?? []).map((a) => a.profile_id)),
    [todayActivities]
  )
  const filledCount = filledProfileIds.size
  const totalProfiles = profiles?.length ?? 0
  const allFilledToday = totalProfiles > 0 && filledCount === totalProfiles
  const todayProgress = totalProfiles > 0 ? Math.round((filledCount / totalProfiles) * 100) : 0

  const totalActionsToday = useMemo(
    () => todayActivities.reduce((s, a) => s + (a.total_actions ?? 0), 0),
    [todayActivities]
  )

  const leadsByStatus = useMemo(() =>
    (leads ?? []).reduce((acc, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1
      return acc
    }, {} as Record<string, number>),
    [leads]
  )

  const currentValueByTarget = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of targets ?? []) {
      const relevant = (allActivities ?? []).filter(
        (a) => a.bd_member_id === t.bd_member_id && a.activity_date >= t.start_date && a.activity_date <= t.end_date
      )
      const sum = relevant.reduce(
        (s, a) => s + Number((a as unknown as Record<string, number>)[t.metric] ?? 0), 0
      )
      map.set(t.id, sum)
    }
    return map
  }, [targets, allActivities])

  const activeTargets = useMemo(
    () => (targets ?? []).filter((t) => t.start_date <= todayStr && t.end_date >= todayStr),
    [targets, todayStr]
  )

  const leadsChartData = useMemo(() => {
    const statusOrder = ['new', 'contacted', 'proposal', 'interview', 'negotiation', 'won', 'lost']
    return statusOrder
      .map((status) => ({ status: STATUS_LABELS[status] ?? status, count: leadsByStatus[status] ?? 0 }))
      .filter((d) => d.count > 0)
  }, [leadsByStatus])

  const isLoading = profilesLoading || activitiesLoading || leadsLoading
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {user?.full_name?.split(' ')[0] ?? 'there'}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Here&apos;s your BD snapshot for today.</p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link to="/activities">
            <CalendarCheck className="size-4" />
            {allFilledToday ? "Review Today's Log" : "Log Today's Activity"}
          </Link>
        </Button>
      </div>

      {/* Today's status — most important card */}
      <Card className={cn(
        'border-2',
        allFilledToday ? 'border-green-500/50 bg-green-50/30 dark:bg-green-950/10' :
        filledCount > 0 ? 'border-amber-400/50 bg-amber-50/20 dark:bg-amber-950/10' :
        'border-primary/30'
      )}>
        <CardContent className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={cn(
                'flex size-14 items-center justify-center rounded-full text-2xl font-bold',
                allFilledToday ? 'bg-green-500/20 text-green-700' :
                filledCount > 0 ? 'bg-amber-400/20 text-amber-700' :
                'bg-primary/10 text-primary'
              )}>
                {isLoading ? '…' : allFilledToday ? '✓' : `${filledCount}`}
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {isLoading ? 'Loading…' :
                   allFilledToday ? 'All accounts logged today!' :
                   filledCount === 0 ? "Start logging today's outreach" :
                   `${filledCount} of ${totalProfiles} accounts logged`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? '' :
                   allFilledToday ? `${totalActionsToday} total actions recorded.` :
                   filledCount === 0 ? `You have ${totalProfiles} account${totalProfiles !== 1 ? 's' : ''} to fill in.` :
                   `${totalProfiles - filledCount} still need numbers. ${totalActionsToday > 0 ? `${totalActionsToday} actions so far.` : ''}`}
                </p>
              </div>
            </div>
            {!allFilledToday && totalProfiles > 0 && !isLoading && (
              <Button asChild variant={filledCount === 0 ? 'default' : 'outline'} className="gap-2">
                <Link to="/activities">
                  Continue logging <ChevronRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
          {totalProfiles > 0 && !isLoading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Today&apos;s progress</span>
                <span>{todayProgress}%</span>
              </div>
              <Progress value={todayProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Incomplete work & notifications — so BD knows what to do first */}
      {(incomplete.incompleteCount > 0 || unreadCount > 0) && (
        <Card className="border-amber-400/50 bg-amber-50/20 dark:bg-amber-950/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600" />
              Your priorities
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tasks and activity to complete. New assignments from admin appear in notifications.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {incomplete.pendingTaskCount > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Pending tasks ({incomplete.pendingTaskCount})
                </p>
                <ul className="space-y-1.5">
                  {(tasks ?? [])
                    .filter((t) => !t.completed_at)
                    .slice(0, 5)
                    .map((t) => (
                      <li key={t.id}>
                        <Link
                          to="/targets"
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                        >
                          <Circle className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{t.title}</span>
                          {t.due_date && (
                            <span className={cn(
                              'ml-auto shrink-0 text-xs',
                              t.due_date < todayStr ? 'text-red-600 font-medium' : 'text-muted-foreground'
                            )}>
                              {t.due_date === todayStr ? 'Today' : t.due_date}
                            </span>
                          )}
                        </Link>
                      </li>
                    ))}
                </ul>
                {(tasks ?? []).filter((t) => !t.completed_at).length > 5 && (
                  <Link to="/targets" className="mt-1 block text-xs text-primary hover:underline">
                    View all tasks →
                  </Link>
                )}
              </div>
            )}
            {incomplete.activityIncomplete && (
              <div className="flex items-center justify-between rounded-lg border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2">
                <div className="flex items-center gap-2">
                  <CalendarCheck className="size-4 text-amber-600" />
                  <span className="text-sm font-medium">Daily activity not complete</span>
                </div>
                <Button asChild size="sm" variant="outline" className="gap-1">
                  <Link to="/activities">Log activity</Link>
                </Button>
              </div>
            )}
            {unreadCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <Bell className="size-4 text-primary" />
                <span className="text-sm">
                  <strong>{unreadCount}</strong> new assignment{unreadCount !== 1 ? 's' : ''} — check the bell above to see details.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Account status grid */}
      {!isLoading && profiles && profiles.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            Account Status Today
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => {
              const filled = filledProfileIds.has(p.id)
              const act = todayActivities.find((a) => a.profile_id === p.id)
              const completed = act?.execution_completed ?? false
              return (
                <Link
                  key={p.id}
                  to="/activities"
                  className={cn(
                    'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/50',
                    completed && 'border-green-500/40 bg-green-50/20 dark:bg-green-950/10',
                    filled && !completed && 'border-amber-400/40 bg-amber-50/10 dark:bg-amber-950/10',
                  )}
                >
                  {completed ? (
                    <CheckCircle2 className="size-4 shrink-0 text-green-600" />
                  ) : filled ? (
                    <Clock className="size-4 shrink-0 text-amber-500" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground/40" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {completed ? 'Done' : filled ? `${act?.total_actions ?? 0} actions — not marked complete` : 'Not filled yet — tap to log'}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/40" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Active targets */}
      {!targetsLoading && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Target className="size-4 text-muted-foreground" />
            Active Targets
          </h2>
          {activeTargets.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-5 text-center">
                <p className="text-sm text-muted-foreground">No active targets set for you right now.</p>
                <p className="text-xs text-muted-foreground mt-1">Ask your admin to set targets so you can track progress here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeTargets.map((t) => {
                const current = currentValueByTarget.get(t.id) ?? 0
                const pct = t.target_value > 0 ? Math.min(100, Math.max(0, (current / t.target_value) * 100)) : 0
                const metricLabel = t.metric.replace(/_/g, ' ')
                return (
                  <Card key={t.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <p className="font-medium capitalize text-sm">{metricLabel}</p>
                          <p className="text-xs text-muted-foreground">{t.period} · ends {t.end_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold tabular-nums">{current.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">of {t.target_value.toLocaleString()}</p>
                        </div>
                      </div>
                      <Progress value={pct} className="h-2 mb-1.5" />
                      <div className="flex items-center justify-between text-xs">
                        <span className={pct >= 100 ? 'text-green-600 dark:text-green-400' : pct >= 50 ? 'text-primary' : 'text-amber-600 dark:text-amber-400'}>
                          {pct >= 100 ? 'Target reached!' : `${pct.toFixed(0)}% complete`}
                        </span>
                        {pct < 100 && (
                          <span className="text-muted-foreground">
                            {(t.target_value - current).toLocaleString()} to go
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Pipeline snapshot */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            My Lead Pipeline
          </h2>
          <Link to="/leads" className="text-xs text-muted-foreground hover:text-foreground underline">
            View full pipeline →
          </Link>
        </div>
        {leadsLoading ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : leads?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-5 flex items-center gap-3 px-5">
              <AlertTriangle className="size-5 text-muted-foreground/50 shrink-0" />
              <div>
                <p className="text-sm font-medium">No leads in your pipeline yet</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Leads you create while logging activity will appear here.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(leadsByStatus).map(([status, count]) => (
                <Link key={status} to="/leads">
                  <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium cursor-pointer', STATUS_COLORS[status])}>
                    <span className="font-bold">{count}</span>
                    <span className="font-normal">{STATUS_LABELS[status] ?? status}</span>
                  </span>
                </Link>
              ))}
            </div>
            {leadsChartData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Distribution across pipeline stages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={leadsChartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                        <XAxis dataKey="status" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                          formatter={(value) => [`${value} lead${value !== 1 ? 's' : ''}`, '']}
                        />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
