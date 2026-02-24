import { useMemo, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Download, TrendingUp, Users, Target, Activity } from 'lucide-react'
import { format, subDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useActivities } from '@/hooks/useActivities'
import { useLeads } from '@/hooks/useLeads'
import { useTargets } from '@/hooks/useTargets'
import { useBDPerformance } from '@/hooks/useBDPerformance'
import { useUserProfiles } from '@/hooks/useUserProfiles'
import { useAuthContext } from '@/providers/AuthProvider'
import { isManagerOrSuperAdmin } from '@/lib/roles'

// ─── helpers ────────────────────────────────────────────────────────────────

const today = new Date()
const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

const QUICK_RANGES = [
  { label: 'This week',  start: fmt(startOfWeek(today, { weekStartsOn: 1 })), end: fmt(endOfWeek(today, { weekStartsOn: 1 })) },
  { label: 'This month', start: fmt(startOfMonth(today)), end: fmt(endOfMonth(today)) },
  { label: 'Last 30 d',  start: fmt(subDays(today, 30)),  end: fmt(today) },
  { label: 'Last 90 d',  start: fmt(subDays(today, 90)),  end: fmt(today) },
]

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const lines = [headers.join(','), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── sub-components ─────────────────────────────────────────────────────────

function KPICard({ label, value, sub, icon: Icon, loading }: {
  label: string; value: string | number; sub?: string; icon: React.ElementType; loading?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-2 h-7 w-20" />
          ) : (
            <p className="mt-1 text-2xl font-bold">{value}</p>
          )}
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className="rounded-lg bg-primary/10 p-2">
          <Icon className="size-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
      <p className="text-sm text-muted-foreground">No data for selected period</p>
    </div>
  )
}

const tooltipStyle = {
  contentStyle: { borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' },
  labelStyle: { color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: 'hsl(var(--muted-foreground))' },
}

// ─── main page ───────────────────────────────────────────────────────────────

export const ReportsPage = () => {
  const { user } = useAuthContext()
  const canSeeTeamReports = isManagerOrSuperAdmin(user)

  const [rangeStart, setRangeStart] = useState(QUICK_RANGES[2].start)
  const [rangeEnd, setRangeEnd] = useState(QUICK_RANGES[2].end)
  const [filterMemberId, setFilterMemberId] = useState<string>('all')

  const { users: bdMembers } = useUserProfiles()
  const bdMemberIdParam = filterMemberId === 'all' ? undefined : filterMemberId

  const { activities, isLoading: actLoading } = useActivities(bdMemberIdParam, rangeStart, rangeEnd)
  const { leads, isLoading: leadsLoading } = useLeads()
  const { targets } = useTargets(bdMemberIdParam)
  const { data: bdPerf, isLoading: perfLoading } = useBDPerformance()

  // ── KPI totals ────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalActions = activities.reduce((s, a) => s + (a.total_actions ?? 0), 0)
    const totalLeads = activities.reduce((s, a) => s + a.leads_created, 0)
    const totalResponses = activities.reduce((s, a) => s + a.responses_received, 0)
    const responseRate = totalActions > 0 ? ((totalResponses / totalActions) * 100).toFixed(1) : '0.0'
    const activeProfiles = new Set(activities.map((a) => a.profile_id)).size
    const completedDays = activities.filter((a) => a.execution_completed).length
    return { totalActions, totalLeads, responseRate, activeProfiles, completedDays }
  }, [activities])

  // ── Activity trend (daily) ─────────────────────────────────────────────────
  const activityTrend = useMemo(() => {
    const byDay = new Map<string, { actions: number; leads: number; responses: number }>()
    for (const a of activities) {
      const d = a.activity_date
      const cur = byDay.get(d) ?? { actions: 0, leads: 0, responses: 0 }
      cur.actions += a.total_actions ?? 0
      cur.leads += a.leads_created
      cur.responses += a.responses_received
      byDay.set(d, cur)
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: format(parseISO(date), 'MMM d'), ...v }))
  }, [activities])

  // ── Platform breakdown ─────────────────────────────────────────────────────
  const platformData = useMemo(() => {
    const byPlatform = new Map<string, number>()
    for (const a of activities) {
      const name = a.platform?.display_name ?? 'Unknown'
      byPlatform.set(name, (byPlatform.get(name) ?? 0) + (a.total_actions ?? 0))
    }
    return Array.from(byPlatform.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([platform, actions]) => ({ platform, actions }))
  }, [activities])

  // ── Response rate trend ────────────────────────────────────────────────────
  const responseRateTrend = useMemo(() => {
    const byDay = new Map<string, { actions: number; responses: number }>()
    for (const a of activities) {
      const d = a.activity_date
      const cur = byDay.get(d) ?? { actions: 0, responses: 0 }
      cur.actions += a.total_actions ?? 0
      cur.responses += a.responses_received
      byDay.set(d, cur)
    }
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: format(parseISO(date), 'MMM d'),
        rate: v.actions > 0 ? parseFloat(((v.responses / v.actions) * 100).toFixed(1)) : 0,
      }))
  }, [activities])

  // ── Lead pipeline (pie) ────────────────────────────────────────────────────
  const leadsInRange = useMemo(() => {
    return leads.filter((l) => l.created_at.slice(0, 10) >= rangeStart && l.created_at.slice(0, 10) <= rangeEnd)
  }, [leads, rangeStart, rangeEnd])

  const pipelineData = useMemo(() => {
    const byStatus = new Map<string, number>()
    for (const l of leadsInRange) {
      byStatus.set(l.status, (byStatus.get(l.status) ?? 0) + 1)
    }
    return Array.from(byStatus.entries()).map(([name, value]) => ({ name, value }))
  }, [leadsInRange])

  // ── Target progress ────────────────────────────────────────────────────────
  const targetProgress = useMemo(() => {
    return targets.map((t) => {
      const relevant = activities.filter(
        (a) => a.activity_date >= t.start_date && a.activity_date <= t.end_date
      )
      let current = 0
      for (const a of relevant) {
        const val = (a as unknown as Record<string, unknown>)[t.metric]
        if (typeof val === 'number') current += val
        else if (t.metric === 'total_actions') current += a.total_actions ?? 0
      }
      const pct = Math.min(100, Math.max(0, t.target_value > 0 ? (current / t.target_value) * 100 : 0))
      return { ...t, current, pct }
    })
  }, [targets, activities])

  // ── CSV exports ────────────────────────────────────────────────────────────
  const handleExportActivities = () => {
    const headers = ['Date', 'Profile', 'Platform', 'Total Actions', 'Responses', 'Leads', 'Proposals', 'Emails', 'Completed']
    const rows = activities.map((a) => [
      a.activity_date,
      a.profile_id,
      a.platform?.display_name ?? '',
      a.total_actions ?? 0,
      a.responses_received,
      a.leads_created,
      a.proposals_sent,
      a.emails_sent,
      a.execution_completed ? 'Yes' : 'No',
    ])
    downloadCSV(`activities-${rangeStart}-to-${rangeEnd}.csv`, headers, rows)
  }

  const handleExportLeads = () => {
    const headers = ['Client', 'Company', 'Status', 'Platform', 'Estimated Value', 'Created At']
    const rows = leadsInRange.map((l) => [
      l.client_name,
      l.company ?? '',
      l.status,
      l.source_platform?.display_name ?? '',
      l.estimated_value,
      format(parseISO(l.created_at), 'yyyy-MM-dd'),
    ])
    downloadCSV(`leads-${rangeStart}-to-${rangeEnd}.csv`, headers, rows)
  }

  const applyQuickRange = (start: string, end: string) => {
    setRangeStart(start)
    setRangeEnd(end)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analytics and performance insights.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportActivities} disabled={actLoading || activities.length === 0}>
            <Download className="mr-1.5 size-3.5" />
            Export Activities
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportLeads} disabled={leadsLoading || leadsInRange.length === 0}>
            <Download className="mr-1.5 size-3.5" />
            Export Leads
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_RANGES.map((r) => (
              <Button
                key={r.label}
                variant={rangeStart === r.start && rangeEnd === r.end ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => applyQuickRange(r.start, r.end)}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={rangeStart}
              max={rangeEnd}
              onChange={(e) => setRangeStart(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={rangeEnd}
              min={rangeStart}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            />
          </div>
          {canSeeTeamReports && (
            <Select value={filterMemberId} onValueChange={setFilterMemberId}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="All BD members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All BD members</SelectItem>
                {bdMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Total Actions" value={kpi.totalActions.toLocaleString()} sub={`${kpi.completedDays} days completed`} icon={Activity} loading={actLoading} />
        <KPICard label="Leads Created" value={kpi.totalLeads.toLocaleString()} sub={`from ${kpi.activeProfiles} profiles`} icon={Users} loading={actLoading} />
        <KPICard label="Response Rate" value={`${kpi.responseRate}%`} sub="responses / total actions" icon={TrendingUp} loading={actLoading} />
        <KPICard label="Leads in Pipeline" value={leadsInRange.length.toLocaleString()} sub="created in range" icon={Target} loading={leadsLoading} />
      </div>

      {/* Charts row 1: Activity trend + Platform breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Activity Trend</CardTitle>
            <CardDescription>Daily total actions and leads created</CardDescription>
          </CardHeader>
          <CardContent>
            {actLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : activityTrend.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={activityTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradActions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="actions" name="Actions" stroke="#6366f1" fill="url(#gradActions)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="leads" name="Leads" stroke="#10b981" fill="url(#gradLeads)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Platform</CardTitle>
            <CardDescription>Total actions per platform</CardDescription>
          </CardHeader>
          <CardContent>
            {actLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : platformData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={platformData} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="platform" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="actions" name="Actions" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2: Response rate trend + Lead pipeline */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Response Rate Trend</CardTitle>
            <CardDescription>Daily response rate (%)</CardDescription>
          </CardHeader>
          <CardContent>
            {actLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : responseRateTrend.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={responseRateTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                  <Tooltip {...tooltipStyle} formatter={(v: number | undefined) => [`${v ?? 0}%`, 'Response Rate']} />
                  <Line type="monotone" dataKey="rate" name="Response Rate" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Lead Pipeline</CardTitle>
            <CardDescription>Leads by stage in selected range</CardDescription>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : pipelineData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" nameKey="name">
                    {pipelineData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Target progress */}
      {targetProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target Progress</CardTitle>
            <CardDescription>Progress against active targets in selected date range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {targetProgress.map((t) => (
                <div key={t.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium capitalize">{t.metric.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-muted-foreground">{t.period} · {t.start_date} → {t.end_date}</p>
                    </div>
                    <Badge variant={t.pct >= 100 ? 'default' : t.pct >= 70 ? 'secondary' : 'outline'}>
                      {t.pct.toFixed(0)}%
                    </Badge>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${t.pct}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {t.current.toLocaleString()} / {t.target_value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BD Performance table (admin only) */}
      {canSeeTeamReports && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">BD Performance — This Month</CardTitle>
            <CardDescription>Aggregated metrics per BD member</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {perfLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : bdPerf.length === 0 ? (
              <div className="flex h-24 items-center justify-center">
                <p className="text-sm text-muted-foreground">No activity data this month.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Member</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                      <th className="px-4 py-3 text-right">Leads</th>
                      <th className="px-4 py-3 text-right">Proposals</th>
                      <th className="px-4 py-3 text-right">Responses</th>
                      <th className="px-4 py-3 text-right">Response Rate</th>
                      <th className="px-4 py-3 text-right">Days Logged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bdPerf.map((row, i) => (
                      <tr key={row.bd_member_id} className={i % 2 === 1 ? 'bg-muted/30' : ''}>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{row.bd_member_name}</p>
                            <p className="text-xs text-muted-foreground">{row.bd_member_email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{row.total_actions.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-mono">{row.total_leads_created}</td>
                        <td className="px-4 py-3 text-right font-mono">{row.total_proposals_sent}</td>
                        <td className="px-4 py-3 text-right font-mono">{row.total_responses_received}</td>
                        <td className="px-4 py-3 text-right">
                          <Badge variant={row.response_rate >= 0.1 ? 'default' : row.response_rate >= 0.05 ? 'secondary' : 'outline'}>
                            {(row.response_rate * 100).toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{row.total_activity_entries}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
