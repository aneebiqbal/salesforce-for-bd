import { useState, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ActivityQuickFillSheet } from '@/components/activities/ActivityQuickFillSheet'
import { useAuth } from '@/hooks/useAuth'
import { useProfiles } from '@/hooks/useProfiles'
import { useActivities } from '@/hooks/useActivities'
import { useCheckInStatus, useCheckIn } from '@/hooks/useCheckIn'
import type { ProfileWithPlatform, DailyActivity as DailyActivityType } from '@/types'
import type { DailyActivityInsert } from '@/hooks/useActivities'
import { Link } from 'react-router'
import { Briefcase, Mail, Linkedin, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const today = () => new Date().toISOString().slice(0, 10)

export const DailyActivity = () => {
  const { user } = useAuth()
  const [activityDate, setActivityDate] = useState(today)
  const [sheetProfile, setSheetProfile] = useState<ProfileWithPlatform | null>(null)
  const [inlineValues, setInlineValues] = useState<Record<string, Partial<Record<string, number>>>>({})

  const { profiles, isLoading: profilesLoading } = useProfiles(user?.id)
  const { activities, isLoading: activitiesLoading, upsertActivity, isUpserting } = useActivities(
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
    user?.id,
    activityDate,
    firstProfile?.id,
    firstProfile?.platform_id
  )

  const activityByProfile = useMemo(() => {
    const map = new Map<string, DailyActivityType>()
    for (const a of activities ?? []) {
      map.set(a.profile_id, a)
    }
    return map
  }, [activities])

  // Task 7: Auto check-out previous session if BD left without checking out
  const autoCheckOutDone = useRef(false)
  useEffect(() => {
    if (!user?.id || autoCheckOutDone.current) return
    autoCheckOutDone.current = true
    void autoCheckOutPreviousSession().catch(() => {}).finally(() => {
      autoCheckOutDone.current = false
    })
  }, [user?.id])

  // Task 1: Auto check-in when BD opens /activities for today (silent, no button)
  const autoCheckInDone = useRef(false)
  useEffect(() => {
    if (
      !user?.id ||
      !firstProfile?.id ||
      !firstProfile?.platform_id ||
      activityDate !== today() ||
      checkInLoading ||
      checkInTime != null ||
      autoCheckInDone.current
    ) {
      return
    }
    autoCheckInDone.current = true
    checkIn().catch(() => {
      autoCheckInDone.current = false
    })
  }, [user?.id, firstProfile?.id, firstProfile?.platform_id, activityDate, checkInLoading, checkInTime, checkIn])

  // Task 10: 1-9 open corresponding profile card
  useEffect(() => {
    if (!profiles?.length) return
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      const n = e.key >= '1' && e.key <= '9' ? parseInt(e.key, 10) : 0
      if (n >= 1 && n <= profiles.length) {
        e.preventDefault()
        setSheetProfile(profiles[n - 1])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [profiles])

  const hoursWorked = useMemo(() => {
    if (!checkInTime || !checkOutTime) return null
    const a = new Date(checkInTime).getTime()
    const b = new Date(checkOutTime).getTime()
    const hours = (b - a) / (1000 * 60 * 60)
    return hours.toFixed(1)
  }, [checkInTime, checkOutTime])

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
      const platformName = sheetProfile?.platform?.display_name ?? ''
      const remaining = Math.max(0, unfilledProfiles.length - 1)
      if (remaining === 0) {
        toast.success('🎉 All done for today!')
      } else {
        toast.success(`✅ ${name} - ${platformName} saved! ${remaining} more to go`)
      }
      setSheetProfile(null)
      const next = getNextUnfilledProfile(sheetProfile)
      if (next) setTimeout(() => setSheetProfile(next), 500)
    } catch {
      toast.error('Failed to save')
    }
  }

  const existingForSheet = sheetProfile
    ? activityByProfile.get(sheetProfile.id) ?? null
    : null

  const defaultActivityRow = useMemo(
    () => ({
      responses_received: 0,
      leads_created: 0,
      execution_completed: false,
      proposals_sent: 0,
      connects_used: 0,
      warmup_messages: 0,
      invites_received: 0,
      interviews: 0,
      easy_applies: 0,
      connection_requests: 0,
      direct_applies: 0,
      dms_sent: 0,
      fetched_emails: 0,
      inmail_sent: 0,
      emails_sent: 0,
      open_rate: 0,
      reply_rate: 0,
      bounced: 0,
      meetings_booked: 0,
    }),
    []
  )

  const handleInlineSave = async (profile: ProfileWithPlatform, _platformName: string) => {
    const existing = activityByProfile.get(profile.id)
    const inline = inlineValues[profile.id] ?? {}
    const payload: DailyActivityInsert = {
      profile_id: profile.id,
      bd_member_id: user!.id,
      platform_id: profile.platform_id,
      activity_date: activityDate,
      check_in_time: existing?.check_in_time ?? null,
      check_out_time: existing?.check_out_time ?? null,
      ...defaultActivityRow,
      ...(existing
        ? {
            responses_received: existing.responses_received,
            leads_created: existing.leads_created,
            execution_completed: existing.execution_completed,
            proposals_sent: existing.proposals_sent,
            connects_used: existing.connects_used,
            warmup_messages: existing.warmup_messages,
            invites_received: existing.invites_received,
            interviews: existing.interviews,
            easy_applies: existing.easy_applies,
            connection_requests: existing.connection_requests,
            direct_applies: existing.direct_applies,
            dms_sent: existing.dms_sent,
            fetched_emails: existing.fetched_emails,
            inmail_sent: existing.inmail_sent,
            emails_sent: existing.emails_sent,
            open_rate: existing.open_rate,
            reply_rate: existing.reply_rate,
            bounced: existing.bounced,
            meetings_booked: existing.meetings_booked,
          }
        : {}),
      ...inline,
      notes: existing?.notes ?? null,
      remarks: existing?.remarks ?? null,
    }
    try {
      await upsertActivity(payload)
      toast.success(`${profile.name} saved`)
    } catch {
      toast.error('Failed to save')
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">Sign in to log activity.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Daily Status</h1>
        <p className="text-muted-foreground">Check in, fill your numbers, check out.</p>
      </div>

      {/* Top bar: date, check-in, check-out, hours */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex min-h-[44px] items-center gap-2">
            <label htmlFor="activity-date" className="text-sm font-medium text-muted-foreground">
              Date
            </label>
            <Input
              id="activity-date"
              type="date"
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              className="min-h-[44px] min-w-[140px]"
            />
          </div>
          <div className="flex min-h-[44px] items-center gap-2">
            <Button
              size="lg"
              variant="outline"
              className="min-h-[44px]"
              disabled={!checkInTime || !!checkOutTime || isCheckingOut || checkInLoading}
              onClick={() => checkOut()}
            >
              {isCheckingOut ? '…' : 'Check Out'}
            </Button>
          </div>
          {(checkInTime || checkOutTime) && (
            <div className="flex min-h-[44px] items-center gap-2 text-sm">
              {checkInTime && (
                <span className="text-muted-foreground">
                  In: {new Date(checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {checkOutTime && (
                <span className="text-muted-foreground">
                  Out: {new Date(checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              {hoursWorked != null && (
                <Badge variant="secondary">Hours: {hoursWorked}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile cards grid */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Your profiles — tap to fill</h2>
        {profilesLoading || activitiesLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        ) : profiles?.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                No profiles assigned to you yet. Ask your admin to assign profiles.
              </p>
              {user?.role === 'admin' && (
                <Button asChild variant="outline" size="sm">
                  <Link to="/profiles">Go to Profiles</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profiles?.map((profile) => {
              const activity = activityByProfile.get(profile.id)
              const platform = profile.platform
              const filled = !!activity
              const completed = activity?.execution_completed ?? false
              const totalActions = activity?.total_actions ?? 0
              const responses = activity?.responses_received ?? 0
              const leads = activity?.leads_created ?? 0

              const summary =
                filled && (totalActions > 0 || responses > 0 || leads > 0)
                  ? `${totalActions} actions, ${responses} responses, ${leads} leads`
                  : filled
                    ? 'Filled'
                    : 'Tap to fill'

              const isUpwork = platform?.name === 'upwork'
              const isLinkedIn = platform?.name === 'linkedin'
              const showInlineQuickFill = (isUpwork || isLinkedIn) && platform

              const inline = inlineValues[profile.id] ?? {}
              const upworkVals = {
                p: inline.proposals_sent ?? activity?.proposals_sent ?? 0,
                c: inline.connects_used ?? activity?.connects_used ?? 0,
                w: inline.warmup_messages ?? activity?.warmup_messages ?? 0,
                i: inline.invites_received ?? activity?.invites_received ?? 0,
              }
              const linkedInVals = {
                ea: inline.easy_applies ?? activity?.easy_applies ?? 0,
                cr: inline.connection_requests ?? activity?.connection_requests ?? 0,
                da: inline.direct_applies ?? activity?.direct_applies ?? 0,
                dm: inline.dms_sent ?? activity?.dms_sent ?? 0,
              }

              return (
                <Card
                  key={profile.id}
                  className={cn(
                    'min-h-[44px] cursor-pointer transition-colors touch-manipulation',
                    !filled && 'border-muted-foreground/30 bg-muted/30',
                    filled && !completed && 'border-yellow-500/50',
                    completed && 'border-green-500/50 bg-green-500/5'
                  )}
                  onClick={() => setSheetProfile(profile)}
                >
                  <CardContent className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{profile.name}</span>
                      {platform && (
                        <PlatformBadge name={platform.name} displayName={platform.display_name} />
                      )}
                    </div>
                    <p className={cn(
                      'text-sm',
                      !filled ? 'text-muted-foreground' : completed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                    )}>
                      {!filled ? 'Tap to fill' : completed ? '✓ Done' : summary}
                    </p>
                    {showInlineQuickFill && (
                      <div
                        className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/50"
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                      >
                        {isUpwork && (
                          <>
                            <InlineNum label="P" value={upworkVals.p} onChange={(v) => setInlineValues((prev) => ({ ...prev, [profile.id]: { ...prev[profile.id], proposals_sent: v } }))} />
                            <InlineNum label="C" value={upworkVals.c} onChange={(v) => setInlineValues((prev) => ({ ...prev, [profile.id]: { ...prev[profile.id], connects_used: v } }))} />
                            <InlineNum label="W" value={upworkVals.w} onChange={(v) => setInlineValues((prev) => ({ ...prev, [profile.id]: { ...prev[profile.id], warmup_messages: v } }))} />
                            <InlineNum label="I" value={upworkVals.i} onChange={(v) => setInlineValues((prev) => ({ ...prev, [profile.id]: { ...prev[profile.id], invites_received: v } }))} />
                          </>
                        )}
                        {isLinkedIn && (
                          <>
                            <InlineNum label="EA" value={linkedInVals.ea} onChange={(v) => setInlineValues((prev) => ({ ...prev, [profile.id]: { ...prev[profile.id], easy_applies: v } }))} />
                            <InlineNum label="CR" value={linkedInVals.cr} onChange={(v) => setInlineValues((prev) => ({ ...prev, [profile.id]: { ...prev[profile.id], connection_requests: v } }))} />
                            <InlineNum label="DA" value={linkedInVals.da} onChange={(v) => setInlineValues((prev) => ({ ...prev, [profile.id]: { ...prev[profile.id], direct_applies: v } }))} />
                            <InlineNum label="DM" value={linkedInVals.dm} onChange={(v) => setInlineValues((prev) => ({ ...prev, [profile.id]: { ...prev[profile.id], dms_sent: v } }))} />
                          </>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          className="h-8 w-8 shrink-0"
                          disabled={isUpserting}
                          onClick={() => handleInlineSave(profile, platform?.display_name ?? '')}
                          aria-label="Save"
                        >
                          <Check className="size-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
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

      {/* Task 7: Floating banner when all profiles filled but not checked out */}
      {activityDate === today() &&
        checkInTime &&
        !checkOutTime &&
        unfilledProfiles.length === 0 &&
        (profiles?.length ?? 0) > 0 && (
          <div
            className="fixed bottom-0 left-0 right-0 z-40 border-t bg-primary px-4 py-3 text-center text-primary-foreground shadow-lg"
            role="button"
            tabIndex={0}
            onClick={() => {
              checkOut().then(() => {
                toast.success('Day ended!')
              })
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLElement).click()}
          >
            All profiles filled! Tap to end your day
          </div>
        )}
    </div>
  )
}

function InlineNum({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[10px] text-muted-foreground w-5">{label}:</span>
      <Input
        type="number"
        min={0}
        max={999}
        value={value || ''}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="h-8 w-12 rounded px-1 text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
    </div>
  )
}

function PlatformBadge({ name, displayName }: { name: string; displayName: string }) {
  const icon = name === 'upwork' ? Briefcase : name === 'linkedin' ? Linkedin : Mail
  const Icon = icon
  const color =
    name === 'upwork'
      ? 'bg-green-500/20 text-green-700 dark:text-green-400'
      : name === 'linkedin'
        ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400'
        : 'bg-orange-500/20 text-orange-700 dark:text-orange-400'
  return (
    <Badge variant="secondary" className={cn('shrink-0 gap-1', color)}>
      <Icon className="size-3.5" />
      {displayName}
    </Badge>
  )
}
