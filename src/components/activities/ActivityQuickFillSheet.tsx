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

  const targetHint = (metric: string, value: number) => {
    const target = getTargetForMetric(targets, metric, activityDate)
    if (target == null) return null
    const met = value >= target
    return (
      <span className={met ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}>
        {met ? <Check className="inline size-3 mr-0.5" /> : null}
        Goal: {target}{met ? ' ✓' : ` (${Math.max(0, target - value)} to go)`}
      </span>
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md p-0">
        {/* Header */}
        <SheetHeader className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SheetTitle className="text-lg">{profile.name}</SheetTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {platform.display_name} · {activityDate}
              </p>
            </div>
            {yesterdayActivity && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 text-xs"
                onClick={copyYesterday}
                title="Copy yesterday's numbers as a starting point (keyboard: C)"
              >
                Copy Yesterday
              </Button>
            )}
          </div>
          {y && (
            <p className="text-xs text-muted-foreground rounded-md bg-muted px-3 py-2 mt-2">
              {isUpwork && `Yesterday: ${y.proposals_sent} proposals · ${y.connects_used} connects · ${y.warmup_messages} warmup msgs`}
              {isLinkedIn && `Yesterday: ${y.easy_applies} applies · ${y.connection_requests} connection reqs · ${y.dms_sent} DMs`}
              {isColdEmail && `Yesterday: ${y.emails_sent} emails sent · ${y.meetings_booked} meetings booked`}
            </p>
          )}
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Platform outreach section */}
          <div className="px-5 py-5 space-y-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {isUpwork ? 'Upwork Outreach' : isLinkedIn ? 'LinkedIn Activity' : 'Email Campaign'} Numbers
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {isUpwork && 'How many proposals, connects, and warmup messages did you send today on this Upwork account?'}
                {isLinkedIn && 'Log your applies, connections, and DMs. Goal is mass volume — cold contacts get warmed up through DM follow-ups and turn into leads.'}
                {isColdEmail && 'Record emails sent and paste open/reply rates from your email tool (Instantly, Lemlist, etc). Track bounces to keep your list clean.'}
              </p>

              {isUpwork && (
                <div className="space-y-4">
                  <div className="rounded-md bg-green-50/60 dark:bg-green-950/20 border border-green-200/60 dark:border-green-800/30 px-3 py-2 text-xs text-green-700 dark:text-green-300">
                    <strong>Upwork goal:</strong> Send proposals &amp; follow up with invites. Clients on Upwork are fewer but warmer — quality over quantity.
                  </div>
                  <NumberStepper
                    label="Proposals Sent"
                    value={state.proposals_sent}
                    onChange={(v) => setState((s) => ({ ...s, proposals_sent: v }))}
                    placeholder={y?.proposals_sent}
                    hint={targetHint('proposals_sent', state.proposals_sent)}
                  />
                  <NumberStepper
                    label="Connects Used"
                    value={state.connects_used}
                    onChange={(v) => setState((s) => ({ ...s, connects_used: v }))}
                    placeholder={y?.connects_used}
                    hint={<span className="text-muted-foreground">Credits spent submitting proposals</span>}
                  />
                  <NumberStepper
                    label="Warmup Messages Sent"
                    value={state.warmup_messages}
                    onChange={(v) => setState((s) => ({ ...s, warmup_messages: v }))}
                    placeholder={y?.warmup_messages}
                    hint={<span className="text-muted-foreground">Pre-proposal intro messages</span>}
                  />
                  <NumberStepper
                    label="Invites Received"
                    value={state.invites_received}
                    onChange={(v) => setState((s) => ({ ...s, invites_received: v }))}
                    placeholder={y?.invites_received}
                    hint={<span className="text-muted-foreground">Clients who invited you to their job</span>}
                  />
                  <NumberStepper
                    label="Interviews Scheduled"
                    value={state.interviews}
                    onChange={(v) => setState((s) => ({ ...s, interviews: v }))}
                    placeholder={y?.interviews}
                    hint={targetHint('interviews', state.interviews)}
                  />
                </div>
              )}

              {isLinkedIn && (
                <div className="space-y-4">
                  <div className="rounded-md bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/30 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                    <strong>LinkedIn goal:</strong> Volume is key. Push daily limits on applies, connections &amp; DMs to build a large cold pipeline, then follow up to convert to warm leads.
                  </div>
                  <NumberStepper
                    label="Easy Applies (1-click applies)"
                    value={state.easy_applies}
                    onChange={(v) => setState((s) => ({ ...s, easy_applies: v }))}
                    placeholder={y?.easy_applies}
                    hint={<span className="text-muted-foreground">Via LinkedIn Easy Apply button — daily limit ~35. These are your quickest volume plays.</span>}
                  />
                  <NumberStepper
                    label="Direct Applies (full application)"
                    value={state.direct_applies}
                    onChange={(v) => setState((s) => ({ ...s, direct_applies: v }))}
                    placeholder={y?.direct_applies}
                    hint={<span className="text-muted-foreground">Full applications on company sites — more targeted, higher quality</span>}
                  />
                  <NumberStepper
                    label="Connection Requests Sent"
                    value={state.connection_requests}
                    onChange={(v) => setState((s) => ({ ...s, connection_requests: v }))}
                    placeholder={y?.connection_requests}
                    hint={<><span className="text-muted-foreground">Building your network — sends cold leads into your funnel. </span>{targetHint('connection_requests', state.connection_requests)}</>}
                  />
                  <NumberStepper
                    label="DMs / Messages Sent"
                    value={state.dms_sent}
                    onChange={(v) => setState((s) => ({ ...s, dms_sent: v }))}
                    placeholder={y?.dms_sent}
                    hint={<><span className="text-muted-foreground">Follow-up or cold DMs — converts cold connections to warm leads. </span>{targetHint('dms_sent', state.dms_sent)}</>}
                  />
                  <NumberStepper
                    label="InMail Messages Sent"
                    value={state.inmail_sent}
                    onChange={(v) => setState((s) => ({ ...s, inmail_sent: v }))}
                    placeholder={y?.inmail_sent}
                    hint={<span className="text-muted-foreground">Paid premium messages to non-connections (limited credits)</span>}
                  />
                  <NumberStepper
                    label="Emails Fetched from Prospects"
                    value={state.fetched_emails}
                    onChange={(v) => setState((s) => ({ ...s, fetched_emails: v }))}
                    placeholder={y?.fetched_emails}
                    hint={<span className="text-muted-foreground">Contact emails found for email follow-up campaigns</span>}
                  />
                </div>
              )}

              {isColdEmail && (
                <div className="space-y-4">
                  <div className="rounded-md bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-800/30 px-3 py-2 text-xs text-orange-700 dark:text-orange-300">
                    <strong>Email goal:</strong> Scale outreach volume and track open + reply rates from your email tool (e.g. Instantly, Lemlist). Good reply rate = 5%+.
                  </div>
                  <NumberStepper
                    label="Emails Sent"
                    value={state.emails_sent}
                    onChange={(v) => setState((s) => ({ ...s, emails_sent: v }))}
                    placeholder={y?.emails_sent}
                    hint={targetHint('emails_sent', state.emails_sent)}
                  />
                  <div>
                    <Label className="text-sm font-medium">
                      Open Rate (%)
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        % of recipients who opened your email
                      </span>
                    </Label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={state.open_rate}
                      onChange={(e) => setState((s) => ({ ...s, open_rate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                      className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">
                      Reply Rate (%)
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        % of recipients who replied
                      </span>
                    </Label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={state.reply_rate}
                      onChange={(e) => setState((s) => ({ ...s, reply_rate: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))}
                      className="mt-1.5 h-11 w-full rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                  <NumberStepper
                    label="Bounced Emails"
                    value={state.bounced}
                    onChange={(v) => setState((s) => ({ ...s, bounced: v }))}
                    placeholder={y?.bounced}
                    hint={<span className="text-muted-foreground">Emails that failed to deliver</span>}
                  />
                  <NumberStepper
                    label="Meetings / Calls Booked"
                    value={state.meetings_booked}
                    onChange={(v) => setState((s) => ({ ...s, meetings_booked: v }))}
                    placeholder={y?.meetings_booked}
                    hint={targetHint('meetings_booked', state.meetings_booked)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Results section */}
          <div className="border-t bg-muted/20 px-5 py-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Results & Outcomes</h3>
            <NumberStepper
              label="Responses Received"
              value={state.responses_received}
              onChange={(v) => setState((s) => ({ ...s, responses_received: v }))}
              placeholder={y?.responses_received}
              hint={<span className="text-muted-foreground">Replies, reactions, or callbacks from prospects</span>}
            />
            <NumberStepper
              label="New Leads Created"
              value={state.leads_created}
              onChange={(v) => setState((s) => ({ ...s, leads_created: v }))}
              placeholder={y?.leads_created}
              hint={targetHint('leads_created', state.leads_created)}
            />

            {/* Execution complete */}
            <div
              className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                state.execution_completed
                  ? 'border-green-500/50 bg-green-500/10'
                  : 'border-border hover:bg-muted/50'
              }`}
              onClick={() => setState((s) => ({ ...s, execution_completed: !s.execution_completed }))}
              role="checkbox"
              aria-checked={state.execution_completed}
              tabIndex={0}
              onKeyDown={(e) => e.key === ' ' && setState((s) => ({ ...s, execution_completed: !s.execution_completed }))}
            >
              <Checkbox
                id="exec-done"
                checked={state.execution_completed}
                onCheckedChange={(c) => setState((s) => ({ ...s, execution_completed: !!c }))}
                onClick={(e) => e.stopPropagation()}
              />
              <div>
                <Label htmlFor="exec-done" className="cursor-pointer font-medium text-sm">
                  Mark execution as complete
                </Label>
                <p className="text-xs text-muted-foreground">
                  Check this when you've finished all planned outreach for this account today.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sheet-notes" className="text-sm font-medium">Notes (optional)</Label>
              <Textarea
                id="sheet-notes"
                value={state.notes}
                onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
                placeholder="Anything notable from today — e.g. 'Got 3 warm replies from health sector outreach'"
                rows={2}
                className="resize-none text-sm"
              />
            </div>
          </div>

          {/* Quick lead section */}
          <div className="border-t px-5 py-4">
            {!showLeadForm ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                onClick={() => setShowLeadForm(true)}
              >
                <span className="text-lg leading-none">+</span>
                <div className="text-left">
                  <p className="font-medium">Add a new lead</p>
                  <p className="text-xs">Got a promising response? Add them to your pipeline now.</p>
                </div>
              </button>
            ) : (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-semibold">New Lead from {profile.name}</p>
                <div className="space-y-1">
                  <Label htmlFor="lead-name" className="text-xs">Client / Company Name</Label>
                  <Input
                    id="lead-name"
                    placeholder="e.g. Acme Corp"
                    value={leadClientName}
                    onChange={(e) => setLeadClientName(e.target.value)}
                    className="h-9"
                    autoFocus
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="lead-value" className="text-xs">Estimated Deal Value ($)</Label>
                  <Input
                    id="lead-value"
                    type="number"
                    min={0}
                    placeholder="0"
                    value={leadEstimatedValue || ''}
                    onChange={(e) => setLeadEstimatedValue(Number(e.target.value) || 0)}
                    className="h-9"
                  />
                </div>
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
                          follow_up_date: null,
                          last_contacted_at: null,
                        })
                        setLeadClientName('')
                        setLeadEstimatedValue(0)
                        setShowLeadForm(false)
                        toast.success('Lead added to your pipeline')
                      } finally {
                        setLeadSaving(false)
                      }
                    }}
                  >
                    {leadSaving ? 'Adding…' : 'Add Lead'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setShowLeadForm(false); setLeadClientName(''); setLeadEstimatedValue(0) }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <SheetFooter className="border-t px-5 py-4">
          <div className="w-full space-y-1">
            <Button
              className="w-full min-h-[44px] text-base"
              disabled={saving}
              onClick={() => handleSave()}
            >
              {saving ? 'Saving…' : 'Save Numbers'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Press Enter to save · Esc to close · C to copy yesterday
            </p>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

