import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ActivityChart } from '@/components/dashboard/ActivityChart'
import { PipelineChart } from '@/components/dashboard/PipelineChart'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Users, Briefcase, ClipboardList, DollarSign,
  CheckCircle2, AlertTriangle, Clock, TrendingUp,
  Linkedin, Mail, ChevronDown, ChevronRight, RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminStats } from '@/hooks/useAdminStats'
import { useTodayTeamStatus } from '@/hooks/useTodayTeamStatus'
import { useClearCheckInForMember } from '@/hooks/useCheckIn'
import { useActivityTrend } from '@/hooks/useActivityTrend'
import { useLeadPipeline } from '@/hooks/useLeadPipeline'
import { useBDPerformance } from '@/hooks/useBDPerformance'
import { useRecentActivities } from '@/hooks/useRecentActivities'
import { formatCurrency, cn } from '@/lib/utils'
import type { TodayTeamStatusRow } from '@/hooks/useTodayTeamStatus'
import type { DailyActivity } from '@/types'

export const AdminDashboard = () => {
  const [expandedBdId, setExpandedBdId] = useState<string | null>(null)
  const { stats, isLoading: statsLoading } = useAdminStats()
  const { rows: todayTeamStatus, isLoading: teamStatusLoading } = useTodayTeamStatus()
  const { data: trendData, isLoading: trendLoading } = useActivityTrend(7)
  const { data: pipelineData, isLoading: pipelineLoading } = useLeadPipeline()
  const { data: bdPerf, isLoading: bdPerfLoading } = useBDPerformance()
  const { data: recentActivities, isLoading: recentLoading } = useRecentActivities(10)
  const { clearCheckOut, clearCheckInAndCheckOut, isClearing } = useClearCheckInForMember()

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const todayDate = new Date().toISOString().slice(0, 10)

  const checkedInCount = todayTeamStatus.filter((r) => r.checked_in).length
  const allDoneCount = todayTeamStatus.filter(
    (r) => r.total_profiles > 0 && r.profiles_filled >= r.total_profiles
  ).length
  const needsAttentionCount = todayTeamStatus.filter(
    (r) => !r.checked_in || (r.total_profiles > 0 && r.profiles_filled < r.total_profiles)
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{today} · Team performance overview</p>
      </div>

      {/* At-a-glance today summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">BD Online Today</p>
                {statsLoading || teamStatusLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-3xl font-bold mt-0.5">
                    {checkedInCount}
                    <span className="text-lg text-muted-foreground">/{todayTeamStatus.length}</span>
                  </p>
                )}
              </div>
              <Users className="size-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">All Profiles Done</p>
                {teamStatusLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-3xl font-bold mt-0.5 text-green-600">
                    {allDoneCount}
                    <span className="text-lg text-muted-foreground">/{todayTeamStatus.length}</span>
                  </p>
                )}
              </div>
              <CheckCircle2 className="size-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Needs Attention</p>
                {teamStatusLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-3xl font-bold mt-0.5 text-amber-600">{needsAttentionCount}</p>
                )}
              </div>
              <AlertTriangle className="size-8 text-amber-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leads This Month</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-12 mt-1" />
                ) : (
                  <p className="text-3xl font-bold mt-0.5">{stats?.leadsThisMonthCount ?? '—'}</p>
                )}
              </div>
              <ClipboardList className="size-8 text-violet-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Team Status — main tracking panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Today's Team Status</CardTitle>
          <p className="text-sm text-muted-foreground">
            Live view — who's working, what they've logged, and how many profiles are done. Click a row to see details.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {teamStatusLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
            </div>
          ) : todayTeamStatus.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No BD members found. Add team members to start tracking.
            </div>
          ) : (
            <div className="divide-y">
              {todayTeamStatus.map((row) => (
                <TeamMemberRow
                  key={row.bd_member_id}
                  row={row}
                  activityDate={todayDate}
                  expanded={expandedBdId === row.bd_member_id}
                  onToggle={() => setExpandedBdId((id) => id === row.bd_member_id ? null : row.bd_member_id)}
                  onClearCheckOut={clearCheckOut}
                  onResetCheckIn={clearCheckInAndCheckOut}
                  isClearing={isClearing}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BD Performance this month */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">BD Performance — This Month</CardTitle>
          <p className="text-sm text-muted-foreground">
            Total outreach actions, leads created, and response rates. Sorted by most active.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {bdPerfLoading ? (
            <Skeleton className="h-40 w-full m-4 rounded-lg" />
          ) : bdPerf.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No BD activity recorded this month.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>BD Member</TableHead>
                    <TableHead className="text-right">Proposals</TableHead>
                    <TableHead className="text-right">LI Applies</TableHead>
                    <TableHead className="text-right">Emails</TableHead>
                    <TableHead className="text-right">Total Actions</TableHead>
                    <TableHead className="text-right">Leads</TableHead>
                    <TableHead className="text-right">Response %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bdPerf.slice().sort((a, b) => b.total_actions - a.total_actions).map((row) => {
                    const rateStr = (row.response_rate * 100).toFixed(1)
                    const rateNum = parseFloat(rateStr)
                    return (
                      <TableRow key={row.bd_member_id}>
                        <TableCell className="font-medium">{row.bd_member_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.total_proposals_sent}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.total_easy_applies}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.total_emails_sent}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{row.total_actions}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={row.total_leads_created > 0 ? 'text-green-600 font-semibold' : ''}>
                            {row.total_leads_created}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            'font-medium',
                            rateNum >= 10 ? 'text-green-600' :
                            rateNum >= 5 ? 'text-amber-600' :
                            'text-muted-foreground'
                          )}>
                            {rateStr}%
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Trend — Last 7 Days</CardTitle>
            <p className="text-sm text-muted-foreground">Total outreach actions per day across all BD members.</p>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <ActivityChart data={trendData} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Pipeline</CardTitle>
            <p className="text-sm text-muted-foreground">Distribution of leads across pipeline stages.</p>
          </CardHeader>
          <CardContent>
            {pipelineLoading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <PipelineChart data={pipelineData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Platform & Team Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Briefcase className="size-4 text-green-600" />
                  <p className="text-xs font-medium text-muted-foreground">Active Profiles</p>
                </div>
                {statsLoading ? <Skeleton className="h-7 w-12" /> : (
                  <p className="text-2xl font-bold">{stats?.activeProfilesCount ?? '—'}</p>
                )}
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="size-4 text-blue-600" />
                  <p className="text-xs font-medium text-muted-foreground">BD Members</p>
                </div>
                {statsLoading ? <Skeleton className="h-7 w-12" /> : (
                  <p className="text-2xl font-bold">{stats?.bdMembersCount ?? '—'}</p>
                )}
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="size-4 text-violet-600" />
                  <p className="text-xs font-medium text-muted-foreground">Total Revenue</p>
                </div>
                {statsLoading ? <Skeleton className="h-7 w-20" /> : (
                  <p className="text-xl font-bold">{stats?.totalRevenue != null ? formatCurrency(stats.totalRevenue) : '—'}</p>
                )}
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="size-4 text-amber-600" />
                  <p className="text-xs font-medium text-muted-foreground">Leads This Month</p>
                </div>
                {statsLoading ? <Skeleton className="h-7 w-12" /> : (
                  <p className="text-2xl font-bold">{stats?.leadsThisMonthCount ?? '—'}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity Log</CardTitle>
            <p className="text-sm text-muted-foreground">Latest entries across the team.</p>
          </CardHeader>
          <CardContent className="p-0">
            {recentLoading ? (
              <Skeleton className="h-40 w-full m-4 rounded-lg" />
            ) : recentActivities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No activities logged yet.</p>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Date</TableHead>
                      <TableHead>BD Member</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                      <TableHead>Done</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivities.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm font-medium">{a.activity_date}</TableCell>
                        <TableCell className="font-medium text-sm">{a.bd_member_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.profile_name}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{a.total_actions}</TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                            a.execution_completed
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          )}>
                            {a.execution_completed ? (
                              <><CheckCircle2 className="size-3" /> Done</>
                            ) : (
                              <><Clock className="size-3" /> Pending</>
                            )}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TeamMemberRow({
  row,
  activityDate,
  expanded,
  onToggle,
  onClearCheckOut,
  onResetCheckIn,
  isClearing,
}: {
  row: TodayTeamStatusRow
  activityDate: string
  expanded: boolean
  onToggle: () => void
  onClearCheckOut: (args: { bdMemberId: string; activityDate: string }) => Promise<unknown>
  onResetCheckIn: (args: { bdMemberId: string; activityDate: string }) => Promise<unknown>
  isClearing: boolean
}) {
  const allFilled = row.total_profiles > 0 && row.profiles_filled >= row.total_profiles
  const partialFilled = row.profiles_filled > 0 && !allFilled
  const notStarted = !row.checked_in && row.profiles_filled === 0
  const hasCheckedOut = row.activities.some((a) => a.check_out_time != null)

  const status = allFilled ? 'done' : (partialFilled || row.checked_in) ? 'in-progress' : 'not-started'

  const totalActions = row.activities.reduce((s, a) => s + (a.total_actions ?? 0), 0)
  const totalLeads = row.activities.reduce((s, a) => s + ((a as unknown as Record<string, number>).leads_created ?? 0), 0)
  const totalResponses = row.activities.reduce((s, a) => s + ((a as unknown as Record<string, number>).responses_received ?? 0), 0)
  const progressPct = row.total_profiles > 0
    ? Math.round((row.profiles_filled / row.total_profiles) * 100)
    : 0

  const lastTime = row.last_activity_time
    ? new Date(row.last_activity_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  const handleClearCheckOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClearCheckOut({ bdMemberId: row.bd_member_id, activityDate })
      .then(() => toast.success('Check-out cleared. They can end day again when ready.'))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to clear check-out'))
  }

  const handleResetCheckIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(`Reset check-in for ${row.bd_name} for this day? They will need to check in again.`)) return
    onResetCheckIn({ bdMemberId: row.bd_member_id, activityDate })
      .then(() => toast.success('Check-in reset.'))
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to reset'))
  }

  return (
    <>
      <div
        className={cn(
          'w-full px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors',
          status === 'done' && 'bg-green-500/5',
          status === 'not-started' && 'bg-red-500/5',
        )}
      >
        <button
          type="button"
          className="flex items-center gap-4 min-w-0 flex-1 text-left"
          onClick={onToggle}
        >
          {/* Status dot */}
          <div className={cn(
            'shrink-0 size-2.5 rounded-full',
            status === 'done' ? 'bg-green-500' :
            status === 'in-progress' ? 'bg-amber-400' : 'bg-red-400'
          )} />

          {/* Name + progress */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{row.bd_name}</span>
              {status === 'done' && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  All done ✓
                </Badge>
              )}
              {notStarted && (
                <Badge variant="secondary" className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                  Not started
                </Badge>
              )}
              {lastTime && (
                <span className="text-xs text-muted-foreground">· last active {lastTime}</span>
              )}
            </div>
            {row.total_profiles > 0 && (
              <div className="flex items-center gap-2 mt-1.5">
                <Progress value={progressPct} className="h-1.5 w-24 flex-shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {row.profiles_filled}/{row.total_profiles} profiles logged
                </span>
              </div>
            )}
          </div>

          {/* Key numbers */}
          <div className="hidden sm:flex items-center gap-5 shrink-0 text-sm">
            <div className="text-center">
              <p className="font-bold tabular-nums">{totalActions}</p>
              <p className="text-xs text-muted-foreground">actions</p>
            </div>
            <div className="text-center">
              <p className={cn('font-bold tabular-nums', totalLeads > 0 ? 'text-green-600' : '')}>
                {totalLeads}
              </p>
              <p className="text-xs text-muted-foreground">leads</p>
            </div>
            <div className="text-center">
              <p className="font-bold tabular-nums">{totalResponses}</p>
              <p className="text-xs text-muted-foreground">responses</p>
            </div>
          </div>

          {/* Expand chevron */}
          {row.activities.length > 0 && (
            expanded
              ? <ChevronDown className="size-4 text-muted-foreground shrink-0" />
              : <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          )}
        </button>

        {/* Admin: undo check-out / reset check-in */}
        {(hasCheckedOut || row.checked_in) && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            {hasCheckedOut && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={isClearing}
                onClick={handleClearCheckOut}
                title="Undo mistaken check-out so they can end day again later"
              >
                <RotateCcw className="size-3 mr-1" />
                Undo check-out
              </Button>
            )}
            {row.checked_in && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                disabled={isClearing}
                onClick={handleResetCheckIn}
                title="Clear check-in and check-out for this day (they check in again)"
              >
                Reset check-in
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && row.activities.length > 0 && (
        <div className="border-t bg-muted/20 px-5 py-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Today's logs</p>
          {row.activities.map((a) => (
            <ActivityDetailRow key={a.id} activity={a} />
          ))}
        </div>
      )}
    </>
  )
}

function ActivityDetailRow({
  activity,
}: {
  activity: DailyActivity & { profile?: { name: string } | null; platform?: { display_name: string } | null }
}) {
  const platform = activity.platform?.display_name ?? '—'
  const profile = activity.profile?.name ?? '—'
  const parts: string[] = []
  if ((activity.proposals_sent ?? 0) > 0) parts.push(`${activity.proposals_sent} proposals`)
  if ((activity.connects_used ?? 0) > 0) parts.push(`${activity.connects_used} connects`)
  if ((activity.easy_applies ?? 0) > 0) parts.push(`${activity.easy_applies} easy applies`)
  if ((activity.direct_applies ?? 0) > 0) parts.push(`${activity.direct_applies} direct applies`)
  if ((activity.indeed_applies ?? 0) > 0) parts.push(`${activity.indeed_applies} indeed applies`)
  if ((activity.connection_requests ?? 0) > 0) parts.push(`${activity.connection_requests} connections`)
  if ((activity.dms_sent ?? 0) > 0) parts.push(`${activity.dms_sent} DMs`)
  if ((activity.emails_sent ?? 0) > 0) parts.push(`${activity.emails_sent} emails`)
  if ((activity.leads_created ?? 0) > 0) parts.push(`${activity.leads_created} leads`)
  if ((activity.responses_received ?? 0) > 0) parts.push(`${activity.responses_received} responses`)
  if (parts.length === 0) parts.push(`${activity.total_actions ?? 0} actions`)

  const PlatformIcon = platform.toLowerCase().includes('linkedin') ? Linkedin :
    platform.toLowerCase().includes('email') ? Mail : Briefcase

  return (
    <div className="flex items-start gap-2.5 rounded-md border bg-card px-3 py-2">
      <PlatformIcon className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{profile}</p>
        <p className="text-xs text-muted-foreground">{parts.join(' · ')}</p>
      </div>
      {activity.execution_completed && (
        <CheckCircle2 className="size-4 shrink-0 text-green-600" />
      )}
    </div>
  )
}
