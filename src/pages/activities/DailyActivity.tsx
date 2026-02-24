import { useState, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { ActivityQuickFillSheet } from '@/components/activities/ActivityQuickFillSheet'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useProfiles'
import { useActivities } from '@/hooks/useActivities'
import { useCheckInStatus, useCheckIn } from '@/hooks/useCheckIn'
import { useTodayTeamStatus } from '@/hooks/useTodayTeamStatus'
import type { ProfileWithPlatform, DailyActivity as DailyActivityType } from '@/types'
import { Link } from 'react-router'
import {
  Briefcase, Mail, Linkedin, CheckCircle2, Clock, ChevronRight,
  ClipboardList, AlertCircle, LogOut, Calendar,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const today = () => new Date().toISOString().slice(0, 10)

export const DailyActivity = () => {
  const { user } = useAuth()
  const [activityDate, setActivityDate] = useState(today)
  const [sheetProfile, setSheetProfile] = useState<ProfileWithPlatform | null>(null)

  const showTeamStatusOnly = user?.role === 'bd_manager' || user?.role === 'super_admin'
  const { rows: teamStatusRows, isLoading: teamStatusLoading } = useTodayTeamStatus()

  const { profiles, isLoading: profilesLoading } = useProfiles(showTeamStatusOnly ? undefined : user?.id)
  const { activities, isLoading: activitiesLoading, upsertActivity } = useActivities(
    user?.id,
    activityDate,
    activityDate
  )
  const { checkInTime, checkOutTime, isLoading: checkInLoading } = useCheckInStatus(
    user?.id,
    activityDate
  )
  const firstProfile = profiles?.[0]
  const { checkIn, checkOut, isCheckingOut, autoCheckOutPreviousSession } = useCheckIn(
    showTeamStatusOnly ? undefined : user?.id,
    activityDate,
    firstProfile?.id ?? undefined,
    firstProfile?.platform_id ?? undefined
  )

  const activityByProfile = useMemo(() => {
    const map = new Map<string, DailyActivityType>()
    for (const a of activities ?? []) map.set(a.profile_id, a)
    return map
  }, [activities])

  // Auto check-out previous session
  const autoCheckOutDone = useRef(false)
  useEffect(() => {
    if (!user?.id || autoCheckOutDone.current) return
    autoCheckOutDone.current = true
    void autoCheckOutPreviousSession().catch(() => {}).finally(() => {
      autoCheckOutDone.current = false
    })
  }, [user?.id])

  // Auto check-in on open for today
  const autoCheckInDone = useRef(false)
  useEffect(() => {
    if (
      !user?.id || !firstProfile?.id || !firstProfile?.platform_id ||
      activityDate !== today() || checkInLoading || checkInTime != null || autoCheckInDone.current
    ) return
    autoCheckInDone.current = true
    checkIn().catch(() => { autoCheckInDone.current = false })
  }, [user?.id, firstProfile?.id, firstProfile?.platform_id, activityDate, checkInLoading, checkInTime, checkIn])

  // Keyboard shortcut: 1-9 opens profile
  useEffect(() => {
    if (!profiles?.length) return
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      const n = e.key >= '1' && e.key <= '9' ? parseInt(e.key, 10) : 0
      if (n >= 1 && n <= profiles.length) { e.preventDefault(); setSheetProfile(profiles[n - 1]) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [profiles])

  const hoursWorked = useMemo(() => {
    if (!checkInTime || !checkOutTime) return null
    const hours = (new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()) / (1000 * 60 * 60)
    return hours.toFixed(1)
  }, [checkInTime, checkOutTime])

  const filledCount = useMemo(
    () => profiles?.filter((p) => activityByProfile.has(p.id)).length ?? 0,
    [profiles, activityByProfile]
  )
  const totalCount = profiles?.length ?? 0
  const allFilled = totalCount > 0 && filledCount === totalCount
  const progressPct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0

  const unfilledProfiles = useMemo(
    () => profiles?.filter((p) => !activityByProfile.get(p.id)) ?? [],
    [profiles, activityByProfile]
  )

  const getNextUnfilledProfile = (after: ProfileWithPlatform | null): ProfileWithPlatform | null => {
    if (!profiles?.length) return null
    const idx = after ? profiles.findIndex((p) => p.id === after.id) : -1
    for (let i = idx + 1; i < profiles.length; i++) {
      if (!activityByProfile.get(profiles[i].id)) return profiles[i]
    }
    for (let i = 0; i <= idx; i++) {
      if (!activityByProfile.get(profiles[i].id)) return profiles[i]
    }
    return null
  }

  const handleSave = async (payload: Parameters<typeof upsertActivity>[0]) => {
    try {
      await upsertActivity(payload)
      const name = sheetProfile?.name ?? 'Profile'
      const remaining = Math.max(0, unfilledProfiles.length - 1)
      if (remaining === 0) {
        toast.success('All profiles logged for today!')
      } else {
        toast.success(`${name} saved — ${remaining} profile${remaining !== 1 ? 's' : ''} left`)
      }
      setSheetProfile(null)
      const next = getNextUnfilledProfile(sheetProfile)
      if (next) setTimeout(() => setSheetProfile(next), 400)
    } catch {
      toast.error('Failed to save. Please try again.')
    }
  }

  const existingForSheet = sheetProfile ? activityByProfile.get(sheetProfile.id) ?? null : null
  const isToday = activityDate === today()

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Sign in to log activity.</p>
      </div>
    )
  }

  if (showTeamStatusOnly) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team Activity Status</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Who has logged activity today. Only BDs fill numbers; managers and super admins monitor here.
          </p>
        </div>
        <Card>
          <CardContent className="p-0">
            {teamStatusLoading ? (
              <div className="space-y-2 p-4">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
              </div>
            ) : teamStatusRows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No team members in your scope.
              </div>
            ) : (
              <div className="divide-y">
                {teamStatusRows.map((row) => {
                  const allFilled = row.total_profiles > 0 && row.profiles_filled >= row.total_profiles
                  const progressPct = row.total_profiles > 0 ? Math.round((row.profiles_filled / row.total_profiles) * 100) : 0
                  return (
                    <div
                      key={row.bd_member_id}
                      className={cn(
                        'flex items-center justify-between gap-4 px-4 py-3',
                        allFilled && 'bg-green-500/5',
                        !row.checked_in && row.profiles_filled === 0 && 'bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'size-2.5 rounded-full shrink-0',
                          allFilled ? 'bg-green-500' : row.profiles_filled > 0 ? 'bg-amber-400' : 'bg-muted-foreground/40'
                        )} />
                        <div>
                          <p className="font-medium">{row.bd_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {row.profiles_filled}/{row.total_profiles} profiles · {allFilled ? 'Done' : row.checked_in ? 'In progress' : 'Not started'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={progressPct} className="h-2 w-20" />
                        <span className="text-sm tabular-nums text-muted-foreground">{progressPct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Log Today's Activity</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Log your numbers right after each outreach session — proposals sent, applies done, DMs sent.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2">
            <Calendar className="size-4 text-muted-foreground" />
            <Input
              id="activity-date"
              type="date"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      {/* Workflow tip — shown until first profile is logged */}
      {!activitiesLoading && activities.length === 0 && profiles && profiles.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-800/40 dark:bg-blue-950/20 px-4 py-3">
          <span className="text-lg leading-none mt-0.5">💡</span>
          <div className="text-sm">
            <p className="font-medium text-blue-900 dark:text-blue-100">Log right after you finish each account's outreach session.</p>
            <p className="text-blue-700/80 dark:text-blue-300/80 mt-0.5">
              <strong>LinkedIn:</strong> Easy applies, connection requests &amp; DMs — volume is key, push daily limits.
              &nbsp;<strong>Upwork:</strong> Proposals &amp; connects used.
              &nbsp;<strong>Email:</strong> Emails sent + open rate from your dashboard.
            </p>
          </div>
        </div>
      )}

      {/* Session status bar */}
      <Card className={cn(
        'border',
        isToday && checkInTime && !checkOutTime ? 'border-green-500/40 bg-green-500/5' :
        isToday && !checkInTime ? 'border-yellow-500/40 bg-yellow-500/5' : ''
      )}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            {/* Check-in status */}
            <div className="flex items-center gap-2">
              <Clock className={cn('size-4', checkInTime ? 'text-green-600' : 'text-muted-foreground')} />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Started</p>
                <p className="text-sm font-semibold">
                  {checkInTime
                    ? new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : isToday ? 'Auto-starting…' : '—'}
                </p>
              </div>
            </div>

            {checkOutTime && (
              <div className="flex items-center gap-2">
                <LogOut className="size-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ended</p>
                  <p className="text-sm font-semibold">
                    {new Date(checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )}

            {hoursWorked && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                {hoursWorked} hrs worked
              </Badge>
            )}
          </div>

          {/* Progress + end day */}
          <div className="flex items-center gap-4">
            {totalCount > 0 && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Profiles logged</p>
                  <p className="text-sm font-bold">{filledCount} / {totalCount}</p>
                </div>
                <div className="w-24">
                  <Progress value={progressPct} className="h-2" />
                </div>
              </div>
            )}
            {isToday && (
              <Button
                variant={allFilled ? 'default' : 'outline'}
                size="sm"
                className="min-h-[40px] gap-2"
                disabled={!checkInTime || !!checkOutTime || isCheckingOut || checkInLoading}
                onClick={() => checkOut().then(() => toast.success('Great work! Day ended.'))}
              >
                <LogOut className="size-4" />
                {isCheckingOut ? 'Ending…' : checkOutTime ? 'Day Ended' : 'End My Day'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile cards */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Your Accounts
            <span className="ml-2 font-normal text-muted-foreground">— tap a card to log numbers</span>
          </h2>
          {filledCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {progressPct}% complete
            </span>
          )}
        </div>

        {profilesLoading || activitiesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : profiles?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center space-y-3">
              <AlertCircle className="mx-auto size-8 text-muted-foreground/50" />
              <div>
                <p className="font-medium">No accounts assigned yet</p>
                <p className="text-sm text-muted-foreground mt-1">Ask your manager or super admin to assign accounts to you.</p>
              </div>
              {user?.role === 'super_admin' && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/profiles">Manage Accounts</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles?.map((profile, idx) => {
              const activity = activityByProfile.get(profile.id)
              const platform = profile.platform
              const filled = !!activity
              const completed = activity?.execution_completed ?? false
              const totalActions = activity?.total_actions ?? 0
              const responses = activity?.responses_received ?? 0
              const leads = activity?.leads_created ?? 0

              return (
                <button
                  key={profile.id}
                  type="button"
                  className={cn(
                    'group relative w-full rounded-xl border text-left transition-all duration-150',
                    'hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    !filled && 'border-border bg-card',
                    filled && !completed && 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/10',
                    completed && 'border-green-500/50 bg-green-50/40 dark:bg-green-950/10'
                  )}
                  onClick={() => setSheetProfile(profile)}
                >
                  {/* Status stripe on left */}
                  <div className={cn(
                    'absolute left-0 top-0 bottom-0 w-1 rounded-l-xl',
                    !filled ? 'bg-muted' : completed ? 'bg-green-500' : 'bg-amber-400'
                  )} />

                  <div className="p-4 pl-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {profiles.length <= 9 && (
                            <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted px-1 rounded">
                              {idx + 1}
                            </span>
                          )}
                          <span className="font-semibold truncate">{profile.name}</span>
                        </div>
                        {platform && (
                          <PlatformBadge name={platform.name} displayName={platform.display_name} />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                        {completed ? (
                          <CheckCircle2 className="size-5 text-green-600" />
                        ) : filled ? (
                          <ClipboardList className="size-5 text-amber-500" />
                        ) : (
                          <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        )}
                      </div>
                    </div>

                    {/* Status line */}
                    {!filled ? (
                      <p className="text-sm text-muted-foreground">
                        {platform?.name === 'linkedin'
                          ? 'Tap to log applies, connections & DMs'
                          : platform?.name === 'upwork'
                            ? 'Tap to log proposals & connects'
                            : 'Tap to log emails sent & response rate'}
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm">
                          {totalActions > 0 && (
                            <span className="font-medium">{totalActions} actions</span>
                          )}
                          {responses > 0 && (
                            <span className="text-muted-foreground">{responses} responses</span>
                          )}
                          {leads > 0 && (
                            <span className="text-muted-foreground">{leads} lead{leads !== 1 ? 's' : ''}</span>
                          )}
                          {totalActions === 0 && responses === 0 && leads === 0 && (
                            <span className="text-muted-foreground">Numbers saved — tap to edit</span>
                          )}
                        </div>
                        <p className={cn(
                          'text-xs font-medium',
                          completed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                        )}>
                          {completed ? 'Execution marked complete' : 'Tap to mark execution complete'}
                        </p>
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <ActivityQuickFillSheet
        open={!!sheetProfile}
        onOpenChange={(open) => !open && setSheetProfile(null)}
        profile={sheetProfile}
        platform={sheetProfile?.platform ?? null}
        activityDate={activityDate}
        bdMemberId={user.id}
        existingActivity={existingForSheet}
        onSave={handleSave}
      />

      {/* Floating end-day banner */}
      {isToday && checkInTime && !checkOutTime && allFilled && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t bg-green-600 px-6 py-4 shadow-lg"
          role="button"
          tabIndex={0}
          onClick={() => checkOut().then(() => toast.success('Great work! Day ended.'))}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).click()}
        >
          <div className="text-white">
            <p className="font-semibold">All accounts logged!</p>
            <p className="text-sm text-green-100">Tap here to end your workday and clock out.</p>
          </div>
          <Button variant="secondary" size="sm" className="shrink-0">
            End My Day
          </Button>
        </div>
      )}
    </div>
  )
}

function PlatformBadge({ name, displayName }: { name: string; displayName: string }) {
  const Icon = name === 'upwork' ? Briefcase : name === 'linkedin' ? Linkedin : Mail
  const color =
    name === 'upwork'
      ? 'bg-green-500/20 text-green-700 dark:text-green-400'
      : name === 'linkedin'
        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
        : 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
  return (
    <Badge variant="secondary" className={cn('mt-1 gap-1 text-xs', color)}>
      <Icon className="size-3" />
      {displayName}
    </Badge>
  )
}
