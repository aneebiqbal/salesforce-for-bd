import * as React from 'react'
import { useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { NumberStepper } from '@/components/ui/number-stepper'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet'
import { useActivityForProfileAndDate } from '@/hooks/useActivities'
import { useTargets } from '@/hooks/useTargets'
import { useLeads } from '@/hooks/useLeads'
import type { ProfileWithPlatform } from '@/types'
import type { Platform } from '@/types'
import type { DailyActivityInsert } from '@/hooks/useActivities'
import type { DailyActivity } from '@/types'
import { toast } from 'sonner'
import { Check } from 'lucide-react'

function yesterdayOf(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

interface ActivityQuickFillSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ProfileWithPlatform | null
  platform: Platform | null
  activityDate: string
  bdMemberId: string
  existingActivity: DailyActivity | null
  onSave: (payload: DailyActivityInsert) => Promise<void>
}

const defaultNumbers = {
  responses_received: 0,
  leads_created: 0,
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
  execution_completed: false,
  notes: '',
  remarks: '',
}

type FormState = typeof defaultNumbers & { notes: string; remarks: string }

function getInitialState(existing: DailyActivity | null): FormState {
  return {
    ...defaultNumbers,
    notes: existing?.notes ?? '',
    remarks: existing?.remarks ?? '',
    responses_received: existing?.responses_received ?? 0,
    leads_created: existing?.leads_created ?? 0,
    execution_completed: existing?.execution_completed ?? false,
    proposals_sent: existing?.proposals_sent ?? 0,
    connects_used: existing?.connects_used ?? 0,
    warmup_messages: existing?.warmup_messages ?? 0,
    invites_received: existing?.invites_received ?? 0,
    interviews: existing?.interviews ?? 0,
    easy_applies: existing?.easy_applies ?? 0,
    connection_requests: existing?.connection_requests ?? 0,
    direct_applies: existing?.direct_applies ?? 0,
    dms_sent: existing?.dms_sent ?? 0,
    fetched_emails: existing?.fetched_emails ?? 0,
    inmail_sent: existing?.inmail_sent ?? 0,
    emails_sent: existing?.emails_sent ?? 0,
    open_rate: existing?.open_rate ?? 0,
    reply_rate: existing?.reply_rate ?? 0,
    bounced: existing?.bounced ?? 0,
    meetings_booked: existing?.meetings_booked ?? 0,
  }
}

function getTargetForMetric(
  targets: { metric: string; target_value: number; start_date: string; end_date: string }[],
  metric: string,
  date: string
): number | null {
  const t = targets.find(
    (x) => x.metric === metric && x.start_date <= date && x.end_date >= date
  )
  return t ? t.target_value : null
}

export const ActivityQuickFillSheet = ({
  open,
  onOpenChange,
  profile,
  platform,
  activityDate,
  bdMemberId,
  existingActivity,
  onSave,
}: ActivityQuickFillSheetProps) => {
  const [state, setState] = React.useState<FormState>(() => getInitialState(existingActivity))
  const yesterdayDate = profile ? yesterdayOf(activityDate) : null
  const { activity: yesterdayActivity } = useActivityForProfileAndDate(
    profile?.id ?? null,
    yesterdayDate
  )
  const { targets } = useTargets(bdMemberId)
  const { createLead } = useLeads()
  const [showLeadForm, setShowLeadForm] = React.useState(false)
  const [leadClientName, setLeadClientName] = React.useState('')
  const [leadEstimatedValue, setLeadEstimatedValue] = React.useState(0)
  const [saving, setSaving] = React.useState(false)
  const [leadSaving, setLeadSaving] = React.useState(false)

  useEffect(() => {
    if (open) {
      const next = getInitialState(existingActivity ?? null)
      setState(next)
      initialSnapshotRef.current = JSON.stringify(next)
    }
  }, [existingActivity?.id, open])

  const initialSnapshotRef = React.useRef<string>('')
  const copyYesterday = useCallback(() => {
    if (!yesterdayActivity) {
      toast.info('No data from yesterday to copy')
      return
    }
    setState(getInitialState(yesterdayActivity))
  }, [yesterdayActivity])

  const handleSave = useCallback(async () => {
    if (!profile || !platform) return
    setSaving(true)
    try {
      const payload: DailyActivityInsert = {
        profile_id: profile.id,
        bd_member_id: bdMemberId,
        platform_id: profile.platform_id,
        activity_date: activityDate,
        check_in_time: existingActivity?.check_in_time ?? null,
        check_out_time: existingActivity?.check_out_time ?? null,
        ...defaultNumbers,
        ...state,
        notes: state.notes || null,
        remarks: state.remarks || null,
      }
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }, [
    profile,
    platform,
    bdMemberId,
    activityDate,
    existingActivity?.check_in_time,
    existingActivity?.check_out_time,
    state,
    onSave,
  ])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        const snapshot = JSON.stringify(state)
        if (snapshot !== initialSnapshotRef.current && !window.confirm('Discard changes?')) {
          return
        }
      }
      onOpenChange(nextOpen)
    },
    [state, onOpenChange]
  )

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleOpenChange(false)
        return
      }
      if (e.key === 'c' || e.key === 'C') {
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        e.preventDefault()
        copyYesterday()
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, copyYesterday, handleSave, handleOpenChange])

  if (!profile || !platform) return null

  const isUpwork = platform.name === 'upwork'
  const isLinkedIn = platform.name === 'linkedin'
  const isColdEmail = platform.name === 'cold_email'

  const y = yesterdayActivity
  const yesterdayLabel =
    y && isUpwork
      ? `Yesterday you did: ${y.proposals_sent} proposals, ${y.connects_used} connects`
      : y && isLinkedIn
        ? `Yesterday you did: ${y.easy_applies} EA, ${y.connection_requests} CR, ${y.direct_applies} DA, ${y.dms_sent} DM`
        : y && isColdEmail
          ? `Yesterday you did: ${y.emails_sent} emails, ${y.meetings_booked} meetings`
          : null

  const targetHint = (metric: string, value: number) => {
    const target = getTargetForMetric(targets, metric, activityDate)
    if (target == null) return null
    const met = value >= target
    return (
      <span className={met ? 'text-green-600 dark:text-green-400' : ''}>
        {met ? <Check className="inline size-3.5" /> : null} target: {target}
      </span>
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{profile.name}</SheetTitle>
          <p className="text-sm text-muted-foreground">{platform.display_name}</p>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto py-4">
          {yesterdayLabel && (
            <p className="text-xs text-muted-foreground rounded-md bg-muted/50 px-3 py-2">
              {yesterdayLabel}
            </p>
          )}
          {yesterdayActivity && (
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={copyYesterday}>
              Copy Yesterday
            </Button>
          )}
          {isUpwork && (
            <div className="space-y-4">
              <NumberStepper label="Proposals Sent" value={state.proposals_sent} onChange={(v) => setState((s) => ({ ...s, proposals_sent: v }))} placeholder={y?.proposals_sent} hint={targetHint('proposals_sent', state.proposals_sent)} />
              <NumberStepper label="Connects Used" value={state.connects_used} onChange={(v) => setState((s) => ({ ...s, connects_used: v }))} placeholder={y?.connects_used} hint={targetHint('connects_used', state.connects_used)} />
              <NumberStepper label="Warmup Messages" value={state.warmup_messages} onChange={(v) => setState((s) => ({ ...s, warmup_messages: v }))} placeholder={y?.warmup_messages} hint={targetHint('warmup_messages', state.warmup_messages)} />
              <NumberStepper label="Invites Received" value={state.invites_received} onChange={(v) => setState((s) => ({ ...s, invites_received: v }))} placeholder={y?.invites_received} hint={targetHint('invites_received', state.invites_received)} />
              <NumberStepper label="Interviews" value={state.interviews} onChange={(v) => setState((s) => ({ ...s, interviews: v }))} placeholder={y?.interviews} hint={targetHint('interviews', state.interviews)} />
            </div>
          )}
          {isLinkedIn && (
            <div className="space-y-4">
              <NumberStepper label="Easy Applies" value={state.easy_applies} onChange={(v) => setState((s) => ({ ...s, easy_applies: v }))} placeholder={y?.easy_applies} hint={targetHint('easy_applies', state.easy_applies)} />
              <p className="text-xs text-muted-foreground">Limit: 35/day</p>
              <NumberStepper label="Connection Requests" value={state.connection_requests} onChange={(v) => setState((s) => ({ ...s, connection_requests: v }))} placeholder={y?.connection_requests} hint={targetHint('connection_requests', state.connection_requests)} />
              <NumberStepper label="Direct Applies" value={state.direct_applies} onChange={(v) => setState((s) => ({ ...s, direct_applies: v }))} placeholder={y?.direct_applies} hint={targetHint('direct_applies', state.direct_applies)} />
              <NumberStepper label="DMs Sent" value={state.dms_sent} onChange={(v) => setState((s) => ({ ...s, dms_sent: v }))} placeholder={y?.dms_sent} hint={targetHint('dms_sent', state.dms_sent)} />
              <NumberStepper label="Fetched Emails" value={state.fetched_emails} onChange={(v) => setState((s) => ({ ...s, fetched_emails: v }))} placeholder={y?.fetched_emails} hint={targetHint('fetched_emails', state.fetched_emails)} />
              <NumberStepper label="InMails Sent" value={state.inmail_sent} onChange={(v) => setState((s) => ({ ...s, inmail_sent: v }))} placeholder={y?.inmail_sent} hint={targetHint('inmail_sent', state.inmail_sent)} />
            </div>
          )}
          {isColdEmail && (
            <div className="space-y-4">
              <NumberStepper label="Emails Sent" value={state.emails_sent} onChange={(v) => setState((s) => ({ ...s, emails_sent: v }))} placeholder={y?.emails_sent} hint={targetHint('emails_sent', state.emails_sent)} />
              <div>
                <Label className="text-muted-foreground">Open Rate %</Label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={state.open_rate}
                  onChange={(e) => setState((s) => ({ ...s, open_rate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                  className="mt-1 h-11 w-full rounded-md border bg-background px-3 text-center"
                />
              </div>
              <div>
                <Label className="text-muted-foreground">Reply Rate %</Label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={state.reply_rate}
                  onChange={(e) => setState((s) => ({ ...s, reply_rate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                  className="mt-1 h-11 w-full rounded-md border bg-background px-3 text-center"
                />
              </div>
              <NumberStepper label="Bounced" value={state.bounced} onChange={(v) => setState((s) => ({ ...s, bounced: v }))} placeholder={y?.bounced} hint={targetHint('bounced', state.bounced)} />
              <NumberStepper label="Meetings Booked" value={state.meetings_booked} onChange={(v) => setState((s) => ({ ...s, meetings_booked: v }))} placeholder={y?.meetings_booked} hint={targetHint('meetings_booked', state.meetings_booked)} />
            </div>
          )}
          <div className="space-y-4 border-t pt-4">
            <NumberStepper label="Responses Received" value={state.responses_received} onChange={(v) => setState((s) => ({ ...s, responses_received: v }))} placeholder={y?.responses_received} hint={targetHint('responses_received', state.responses_received)} />
            <NumberStepper label="Leads Created" value={state.leads_created} onChange={(v) => setState((s) => ({ ...s, leads_created: v }))} placeholder={y?.leads_created} hint={targetHint('leads_created', state.leads_created)} />
            <div className="flex min-h-[44px] items-center gap-2">
              <Checkbox
                id="exec-done"
                checked={state.execution_completed}
                onCheckedChange={(c) => setState((s) => ({ ...s, execution_completed: !!c }))}
              />
              <Label htmlFor="exec-done" className="cursor-pointer">Execution completed</Label>
            </div>
            <div className="space-y-2">
              <Label>Quick Notes</Label>
              <Textarea
                value={state.notes}
                onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Notes..."
                rows={2}
                className="min-h-[44px] resize-none"
              />
            </div>
            {/* Task 9: Quick lead from activity */}
            <div className="border-t pt-4">
              {!showLeadForm ? (
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground underline"
                  onClick={() => setShowLeadForm(true)}
                >
                  + New Lead
                </button>
              ) : (
                <div className="space-y-2 rounded-md border bg-muted/30 p-3">
                  <Label className="text-xs">Quick lead (from this profile)</Label>
                  <Input
                    placeholder="Client name"
                    value={leadClientName}
                    onChange={(e) => setLeadClientName(e.target.value)}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Estimated value"
                    value={leadEstimatedValue || ''}
                    onChange={(e) => setLeadEstimatedValue(Number(e.target.value) || 0)}
                    className="h-9"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!leadClientName.trim() || leadSaving}
                      onClick={async () => {
                        if (!profile?.platform_id) return
                        setLeadSaving(true)
                        try {
                          await createLead({
                            client_name: leadClientName.trim(),
                            email: null,
                            company: null,
                            source_platform_id: profile.platform_id,
                            source_profile_id: profile.id,
                            status: 'new',
                            assigned_to: bdMemberId,
                            estimated_value: leadEstimatedValue,
                            notes: null,
                          })
                          setLeadClientName('')
                          setLeadEstimatedValue(0)
                          setShowLeadForm(false)
                          toast.success('Lead created')
                        } finally {
                          setLeadSaving(false)
                        }
                      }}
                    >
                      {leadSaving ? '…' : 'Save Lead'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowLeadForm(false); setLeadClientName(''); setLeadEstimatedValue(0) }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button className="w-full min-h-[44px]" disabled={saving} onClick={() => handleSave()}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

