import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import type { Platform } from '@/types'
import type { DailyActivityInsert } from '@/hooks/useActivities'
import { useActivityForProfileAndDate } from '@/hooks/useActivities'

const dailyActivitySchema = z.object({
  profile_id: z.string().uuid('Profile is required'),
  activity_date: z.string().min(1, 'Date is required'),
  platform_id: z.string().uuid('Platform is required'),
  bd_member_id: z.string().uuid('BD member is required'),
  responses_received: z.coerce.number().min(0),
  leads_created: z.coerce.number().min(0),
  notes: z.string().optional(),
  remarks: z.string().optional(),
  execution_completed: z.boolean(),
  proposals_sent: z.coerce.number().min(0),
  connects_used: z.coerce.number().min(0),
  warmup_messages: z.coerce.number().min(0),
  invites_received: z.coerce.number().min(0),
  interviews: z.coerce.number().min(0),
  easy_applies: z.coerce.number().min(0),
  connection_requests: z.coerce.number().min(0),
  direct_applies: z.coerce.number().min(0),
  indeed_applies: z.coerce.number().min(0),
  dms_sent: z.coerce.number().min(0),
  fetched_emails: z.coerce.number().min(0),
  inmail_sent: z.coerce.number().min(0),
  emails_sent: z.coerce.number().min(0),
  open_rate: z.coerce.number().min(0),
  reply_rate: z.coerce.number().min(0),
  bounced: z.coerce.number().min(0),
  meetings_booked: z.coerce.number().min(0),
})

export type DailyActivityFormValues = z.infer<typeof dailyActivitySchema>

interface DailyActivityFormProps {
  onSubmit: (values: DailyActivityInsert) => void | Promise<void>
  platforms: Platform[]
  profiles: { id: string; name: string; platform_id: string }[]
  bdMemberId: string
}

export const DailyActivityForm = ({ onSubmit, platforms, profiles, bdMemberId }: DailyActivityFormProps) => {
  const form = useForm<DailyActivityFormValues>({
    resolver: zodResolver(dailyActivitySchema) as import('react-hook-form').Resolver<DailyActivityFormValues>,
    defaultValues: {
      activity_date: new Date().toISOString().slice(0, 10),
      bd_member_id: bdMemberId,
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
      indeed_applies: 0,
      dms_sent: 0,
      fetched_emails: 0,
      inmail_sent: 0,
      emails_sent: 0,
      open_rate: 0,
      reply_rate: 0,
      bounced: 0,
      meetings_booked: 0,
    },
  })

  const profileId = form.watch('profile_id')
  const activityDate = form.watch('activity_date')
  const { activity: existingActivity } = useActivityForProfileAndDate(profileId || null, activityDate || null)

  useEffect(() => {
    if (!existingActivity || !profileId || !activityDate) return
    if (existingActivity.profile_id !== profileId || existingActivity.activity_date !== activityDate) return
    form.reset({
      profile_id: existingActivity.profile_id,
      activity_date: existingActivity.activity_date,
      platform_id: existingActivity.platform_id,
      bd_member_id: existingActivity.bd_member_id,
      responses_received: existingActivity.responses_received,
      leads_created: existingActivity.leads_created,
      notes: existingActivity.notes ?? '',
      remarks: existingActivity.remarks ?? '',
      execution_completed: existingActivity.execution_completed,
      proposals_sent: existingActivity.proposals_sent,
      connects_used: existingActivity.connects_used,
      warmup_messages: existingActivity.warmup_messages,
      invites_received: existingActivity.invites_received,
      interviews: existingActivity.interviews,
      easy_applies: existingActivity.easy_applies,
      connection_requests: existingActivity.connection_requests,
      direct_applies: existingActivity.direct_applies,
      indeed_applies: existingActivity.indeed_applies,
      dms_sent: existingActivity.dms_sent,
      fetched_emails: existingActivity.fetched_emails,
      inmail_sent: existingActivity.inmail_sent,
      emails_sent: existingActivity.emails_sent,
      open_rate: existingActivity.open_rate,
      reply_rate: existingActivity.reply_rate,
      bounced: existingActivity.bounced,
      meetings_booked: existingActivity.meetings_booked,
    })
  }, [existingActivity?.id, profileId, activityDate])

  useEffect(() => {
    if (!profileId) return
    const profile = profiles.find((p) => p.id === profileId)
    if (profile) form.setValue('platform_id', profile.platform_id)
  }, [profileId, profiles])

  const platformId = form.watch('platform_id')
  const selectedPlatform = platforms.find((p) => p.id === platformId)

  const mapToInsert = (data: DailyActivityFormValues): DailyActivityInsert => ({
    profile_id: data.profile_id,
    bd_member_id: data.bd_member_id,
    platform_id: data.platform_id,
    activity_date: data.activity_date,
    check_in_time: existingActivity?.check_in_time ?? null,
    check_out_time: existingActivity?.check_out_time ?? null,
    responses_received: data.responses_received,
    leads_created: data.leads_created,
    notes: data.notes ?? null,
    remarks: data.remarks ?? null,
    execution_completed: data.execution_completed,
    proposals_sent: data.proposals_sent,
    connects_used: data.connects_used,
    warmup_messages: data.warmup_messages,
    invites_received: data.invites_received,
    interviews: data.interviews,
    easy_applies: data.easy_applies,
    connection_requests: data.connection_requests,
    direct_applies: data.direct_applies,
    indeed_applies: data.indeed_applies,
    dms_sent: data.dms_sent,
    fetched_emails: data.fetched_emails,
    inmail_sent: data.inmail_sent,
    emails_sent: data.emails_sent,
    open_rate: data.open_rate,
    reply_rate: data.reply_rate,
    bounced: data.bounced,
    meetings_booked: data.meetings_booked,
  })

  return (
    <form
      className="space-y-4"
      onSubmit={form.handleSubmit(async (data) => {
        await onSubmit(mapToInsert(data))
      })}
    >
      <div className="space-y-2">
        <Label>Profile</Label>
        <Select
          value={form.watch('profile_id')}
          onValueChange={(v) => form.setValue('profile_id', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select your profile" />
          </SelectTrigger>
          <SelectContent>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.profile_id && (
          <p className="text-xs text-destructive">{form.formState.errors.profile_id.message}</p>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Date</Label>
          <Input type="date" {...form.register('activity_date')} />
          {form.formState.errors.activity_date && (
            <p className="text-xs text-destructive">{form.formState.errors.activity_date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Platform</Label>
          <Input
            value={selectedPlatform?.display_name ?? ''}
            readOnly
            className="bg-muted"
          />
          <input type="hidden" {...form.register('platform_id')} />
        </div>
      </div>
      {selectedPlatform?.name === 'upwork' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>Proposals sent</Label>
            <Input type="number" min={0} {...form.register('proposals_sent')} />
          </div>
          <div className="space-y-2">
            <Label>Connects used</Label>
            <Input type="number" min={0} {...form.register('connects_used')} />
          </div>
          <div className="space-y-2">
            <Label>Warmup messages</Label>
            <Input type="number" min={0} {...form.register('warmup_messages')} />
          </div>
          <div className="space-y-2">
            <Label>Invites received</Label>
            <Input type="number" min={0} {...form.register('invites_received')} />
          </div>
          <div className="space-y-2">
            <Label>Interviews</Label>
            <Input type="number" min={0} {...form.register('interviews')} />
          </div>
        </div>
      )}
      {selectedPlatform?.name === 'linkedin' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Easy applies (LinkedIn)</Label>
            <Input type="number" min={0} {...form.register('easy_applies')} />
          </div>
          <div className="space-y-2">
            <Label>Direct applies (full applications)</Label>
            <Input type="number" min={0} {...form.register('direct_applies')} />
          </div>
          <div className="space-y-2">
            <Label>Indeed applies</Label>
            <Input type="number" min={0} {...form.register('indeed_applies')} />
          </div>
          <div className="space-y-2">
            <Label>Connection requests</Label>
            <Input type="number" min={0} {...form.register('connection_requests')} />
          </div>
          <div className="space-y-2">
            <Label>DMs sent</Label>
            <Input type="number" min={0} {...form.register('dms_sent')} />
          </div>
          <div className="space-y-2">
            <Label>Fetched emails</Label>
            <Input type="number" min={0} {...form.register('fetched_emails')} />
          </div>
          <div className="space-y-2">
            <Label>InMail sent</Label>
            <Input type="number" min={0} {...form.register('inmail_sent')} />
          </div>
        </div>
      )}
      {selectedPlatform?.name === 'cold_email' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-2">
            <Label>Emails sent</Label>
            <Input type="number" min={0} {...form.register('emails_sent')} />
          </div>
          <div className="space-y-2">
            <Label>Open rate %</Label>
            <Input type="number" min={0} {...form.register('open_rate')} />
          </div>
          <div className="space-y-2">
            <Label>Reply rate %</Label>
            <Input type="number" min={0} {...form.register('reply_rate')} />
          </div>
          <div className="space-y-2">
            <Label>Bounced</Label>
            <Input type="number" min={0} {...form.register('bounced')} />
          </div>
          <div className="space-y-2">
            <Label>Meetings booked</Label>
            <Input type="number" min={0} {...form.register('meetings_booked')} />
          </div>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Responses received</Label>
          <Input type="number" min={0} {...form.register('responses_received')} />
        </div>
        <div className="space-y-2">
          <Label>Leads created</Label>
          <Input type="number" min={0} {...form.register('leads_created')} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="execution_completed"
          checked={form.watch('execution_completed')}
          onCheckedChange={(c) => form.setValue('execution_completed', !!c)}
        />
        <Label htmlFor="execution_completed">Execution completed</Label>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea placeholder="Notes" {...form.register('notes')} />
      </div>
      <div className="space-y-2">
        <Label>Remarks</Label>
        <Textarea placeholder="Remarks" {...form.register('remarks')} />
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving…' : 'Save activity'}
      </Button>
    </form>
  )
}
