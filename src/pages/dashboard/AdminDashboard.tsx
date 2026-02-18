import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/StatCard'
import { ActivityChart } from '@/components/dashboard/ActivityChart'
import { PipelineChart } from '@/components/dashboard/PipelineChart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { useAdminStats } from '@/hooks/useAdminStats'
import { useTodayTeamStatus } from '@/hooks/useTodayTeamStatus'
import { useActivityTrend } from '@/hooks/useActivityTrend'
import { useLeadPipeline } from '@/hooks/useLeadPipeline'
import { useBDPerformance } from '@/hooks/useBDPerformance'
import { useRecentActivities } from '@/hooks/useRecentActivities'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">Overview of BD team performance.</p>
      </div>

      {/* Task 8: Today's Team Status - first section */}
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Team Status</CardTitle>
        </CardHeader>
        <CardContent>
          {teamStatusLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : todayTeamStatus.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No BD members.</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>BD Name</TableHead>
                    <TableHead>Checked In</TableHead>
                    <TableHead>Profiles Filled</TableHead>
                    <TableHead>Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayTeamStatus.map((row) => (
                    <TodayTeamStatusRowComponent
                      key={row.bd_member_id}
                      row={row}
                      expanded={expandedBdId === row.bd_member_id}
                      onToggle={() => setExpandedBdId((id) => (id === row.bd_member_id ? null : row.bd_member_id))}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 1 - Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <StatCard title="Total BD Members" value={stats?.bdMembersCount ?? '—'} description="bd_manager role" />
            <StatCard title="Active Profiles" value={stats?.activeProfilesCount ?? '—'} description="Across platforms" />
            <StatCard title="Leads This Month" value={stats?.leadsThisMonthCount ?? '—'} description="Created this month" />
            <StatCard title="Total Revenue" value={stats?.totalRevenue != null ? formatCurrency(stats.totalRevenue) : '—'} description="Active + completed projects" />
          </>
        )}
      </div>

      {/* Row 2 - Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily Activity Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <ActivityChart data={trendData} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Lead Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {pipelineLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <PipelineChart data={pipelineData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3 - BD Performance + Recent Activities */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>BD Performance (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            {bdPerfLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : bdPerf.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No BD data yet.</p>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>BD Member</TableHead>
                      <TableHead className="text-right">Proposals</TableHead>
                      <TableHead className="text-right">Leads</TableHead>
                      <TableHead className="text-right">Response Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bdPerf.map((row) => (
                      <TableRow key={row.bd_member_id}>
                        <TableCell className="font-medium">{row.bd_member_name}</TableCell>
                        <TableCell className="text-right">{row.total_proposals_sent + row.total_easy_applies + row.total_emails_sent}</TableCell>
                        <TableCell className="text-right">{row.total_leads_created}</TableCell>
                        <TableCell className="text-right">{(row.response_rate * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : recentActivities.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No activities yet.</p>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>BD Member</TableHead>
                      <TableHead>Profile</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                      <TableHead>Done</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentActivities.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{a.activity_date}</TableCell>
                        <TableCell>{a.bd_member_name}</TableCell>
                        <TableCell>{a.profile_name}</TableCell>
                        <TableCell>{a.platform_display_name}</TableCell>
                        <TableCell className="text-right">{a.total_actions}</TableCell>
                        <TableCell>{a.execution_completed ? 'Yes' : 'No'}</TableCell>
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

function TodayTeamStatusRowComponent({
  row,
  expanded,
  onToggle,
}: {
  row: TodayTeamStatusRow
  expanded: boolean
  onToggle: () => void
}) {
  const status =
    !row.checked_in
      ? 'red'
      : row.total_profiles === 0
        ? 'green'
        : row.profiles_filled >= row.total_profiles
          ? 'green'
          : 'yellow'
  const lastTime = row.last_activity_time
    ? new Date(row.last_activity_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '—'
  return (
    <>
      <TableRow
        className={cn(
          'cursor-pointer',
          status === 'red' && 'bg-red-500/10 border-red-500/30',
          status === 'yellow' && 'bg-yellow-500/10 border-yellow-500/30',
          status === 'green' && 'bg-green-500/10 border-green-500/30'
        )}
        onClick={onToggle}
      >
        <TableCell className="font-medium">{row.bd_name}</TableCell>
        <TableCell>{row.checked_in ? 'Yes' : 'No'}</TableCell>
        <TableCell>
          {row.profiles_filled}/{row.total_profiles}
        </TableCell>
        <TableCell>{lastTime}</TableCell>
      </TableRow>
      {expanded && row.activities.length > 0 && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={4} className="py-3">
            <div className="space-y-2 pl-4">
              {row.activities.map((a) => (
                <ActivitySummary key={a.id} activity={a} />
              ))}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function ActivitySummary({
  activity,
}: {
  activity: DailyActivity & { profile?: { name: string } | null; platform?: { display_name: string } | null }
}) {
  const total = activity.total_actions ?? 0
  const parts: string[] = []
  if ((activity.proposals_sent ?? 0) > 0) parts.push(`${activity.proposals_sent} proposals`)
  if ((activity.connects_used ?? 0) > 0) parts.push(`${activity.connects_used} connects`)
  if ((activity.easy_applies ?? 0) > 0) parts.push(`${activity.easy_applies} EA`)
  if ((activity.connection_requests ?? 0) > 0) parts.push(`${activity.connection_requests} CR`)
  if ((activity.emails_sent ?? 0) > 0) parts.push(`${activity.emails_sent} emails`)
  if (parts.length === 0 && total > 0) parts.push(`${total} actions`)
  const platformName = activity.platform?.display_name ?? '—'
  const profileName = activity.profile?.name ?? '—'
  return (
    <div className="text-sm text-muted-foreground">
      {profileName} ({platformName}): {parts.length ? parts.join(', ') : '—'} · Done: {activity.execution_completed ? 'Yes' : 'No'}
    </div>
  )
}
