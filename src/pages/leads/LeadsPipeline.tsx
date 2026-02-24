import React, { useState, useMemo, memo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQueryClient } from '@tanstack/react-query'
import { useLeads, LEADS_QUERY_KEY } from '@/hooks/useLeads'
import { usePlatforms } from '@/hooks/usePlatforms'
import { useProfiles } from '@/hooks/useProfiles'
import { useAssignableMembers } from '@/hooks/useTeam'
import { createNotification } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { isManagerOrSuperAdmin, isBd } from '@/lib/roles'
import { LEAD_STATUSES } from '@/lib/constants'
import { formatCurrency, cn } from '@/lib/utils'
import type { Lead } from '@/types'
import type { LeadStatus } from '@/types'
import { Trash2, Calendar, AlertCircle, Clock } from 'lucide-react'

const STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'proposal', 'interview', 'negotiation', 'won', 'lost']

const STATUS_LABEL_MAP: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  proposal: 'Proposal Sent',
  interview: 'In Interview',
  negotiation: 'Negotiating',
  won: 'Won',
  lost: 'Lost',
}

function getFollowUpState(date: string | null, today: string): 'overdue' | 'today' | 'upcoming' | null {
  if (!date) return null
  if (date < today) return 'overdue'
  if (date === today) return 'today'
  return 'upcoming'
}

export const LeadsPipeline = () => {
  const today = new Date().toISOString().slice(0, 10)
  const { user } = useAuth()

  const [addOpen, setAddOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null)

  const queryClient = useQueryClient()
  const { leads, isLoading, createLead, updateLead, deleteLead } = useLeads()
  const { platforms } = usePlatforms()
  const { profiles } = useProfiles(undefined)
  const { members: assignableMembers } = useAssignableMembers()
  const canAssignLeads = isManagerOrSuperAdmin(user)

  const leadsByStatus = useMemo(() => {
    const map = new Map<LeadStatus, Lead[]>()
    for (const s of STATUS_ORDER) map.set(s, [])
    for (const lead of leads ?? []) {
      const list = map.get(lead.status as LeadStatus)
      if (list) list.push(lead)
    }
    return map
  }, [leads])

  // Count overdue follow-ups for alert banner
  const overdueFollowUps = useMemo(() =>
    (leads ?? []).filter((l) =>
      l.follow_up_date && l.follow_up_date < today &&
      l.status !== 'won' && l.status !== 'lost'
    ),
    [leads, today]
  )

  const dueTodayFollowUps = useMemo(() =>
    (leads ?? []).filter((l) =>
      l.follow_up_date === today &&
      l.status !== 'won' && l.status !== 'lost'
    ),
    [leads, today]
  )

  const handleAdd = async (values: LeadFormValues) => {
    // BD can only create leads assigned to self (RLS); default so form works
    const assigneeId = values.assigned_to || (isBd(user) ? user?.id ?? null : null) || null
    try {
      await createLead({
        client_name: values.client_name,
        email: values.email || null,
        company: values.company || null,
        source_platform_id: values.source_platform_id,
        source_profile_id: values.source_profile_id || null,
        status: values.status,
        assigned_to: assigneeId,
        estimated_value: values.estimated_value,
        notes: values.notes || null,
        follow_up_date: values.follow_up_date || null,
        last_contacted_at: values.last_contacted_at || null,
      })
      if (canAssignLeads && assigneeId && assigneeId !== user?.id) {
        await createNotification({
          user_id: assigneeId,
          type: 'lead_assigned',
          title: 'Lead assigned to you',
          message: values.client_name,
          link: '/leads',
        })
      }
      toast.success('Lead created')
      setAddOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create lead')
    }
  }

  const handleUpdate = async (values: LeadFormValues) => {
    if (!editingLead) return
    const assigneeId = values.assigned_to || null
    const previousAssignee = editingLead.assigned_to || null
    try {
      await updateLead({
        id: editingLead.id,
        payload: {
          client_name: values.client_name,
          email: values.email || null,
          company: values.company || null,
          source_platform_id: values.source_platform_id,
          source_profile_id: values.source_profile_id || null,
          status: values.status,
          assigned_to: assigneeId,
          estimated_value: values.estimated_value,
          notes: values.notes || null,
          follow_up_date: values.follow_up_date || null,
          last_contacted_at: values.last_contacted_at || null,
        },
      })
      if (canAssignLeads && assigneeId && assigneeId !== previousAssignee && assigneeId !== user?.id) {
        await createNotification({
          user_id: assigneeId,
          type: 'lead_assigned',
          title: 'Lead assigned to you',
          message: values.client_name,
          link: '/leads',
        })
      }
      toast.success('Lead updated')
      setEditingLead(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update lead')
    }
  }

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const handleDeleteClick = () => setDeleteConfirmOpen(true)
  const handleDeleteConfirm = async () => {
    if (!editingLead) return
    try {
      await deleteLead(editingLead.id)
      toast.success('Lead deleted')
      setEditingLead(null)
      setDeleteConfirmOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete lead')
    }
  }

  // Quick "mark as contacted today" from card
  const handleMarkContacted = async (lead: Lead, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await updateLead({ id: lead.id, payload: { last_contacted_at: today } })
      toast.success(`${lead.client_name} marked as contacted today`)
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lead.id)
  }

  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStatus(status)
  }

  const handleDragLeave = () => setDragOverStatus(null)

  const handleDrop = async (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault()
    setDragOverStatus(null)
    const lead = draggedLead
    setDraggedLead(null)
    if (!lead || lead.status === newStatus) return
    try {
      await updateLead({ id: lead.id, payload: { status: newStatus } })
      toast.success('Lead moved')
    } catch {
      queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY })
      toast.error('Failed to move lead.')
    }
  }

  const assignedName = (userId: string | null) =>
    userId ? assignableMembers.find((m) => m.id === userId)?.full_name ?? '—' : '—'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track prospects and move them through stages. Drag cards to advance a lead.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add Lead</Button>
      </div>

      {/* Follow-up alert banners */}
      {!isLoading && overdueFollowUps.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-red-300/60 bg-red-50/50 dark:border-red-800/40 dark:bg-red-950/20 px-4 py-3">
          <AlertCircle className="size-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-red-700 dark:text-red-300 text-sm">
              {overdueFollowUps.length} overdue follow-up{overdueFollowUps.length !== 1 ? 's' : ''} — action needed now
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {overdueFollowUps.slice(0, 5).map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setEditingLead(l)}
                  className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
                >
                  {l.client_name}
                  <span className="text-red-500">· {l.follow_up_date}</span>
                </button>
              ))}
              {overdueFollowUps.length > 5 && (
                <span className="text-xs text-red-600 dark:text-red-400">+{overdueFollowUps.length - 5} more</span>
              )}
            </div>
          </div>
        </div>
      )}

      {!isLoading && dueTodayFollowUps.length > 0 && overdueFollowUps.length === 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-300/60 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/20 px-4 py-3">
          <Clock className="size-4 text-amber-600 shrink-0" />
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            {dueTodayFollowUps.length} lead{dueTodayFollowUps.length !== 1 ? 's' : ''} to follow up with today:
            {' '}{dueTodayFollowUps.map((l) => l.client_name).join(', ')}
          </p>
        </div>
      )}

      {/* Kanban board */}
      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STATUS_ORDER.map((s) => (
            <Skeleton key={s} className="h-96 w-72 shrink-0 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {STATUS_ORDER.map((status) => {
            const columnLeads = leadsByStatus.get(status) ?? []
            const overdueInCol = columnLeads.filter(
              (l) => l.follow_up_date && l.follow_up_date < today
            ).length
            return (
              <div
                key={status}
                className={cn(
                  'flex h-full min-h-[420px] w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors',
                  dragOverStatus === status && 'border-primary bg-muted/50',
                  status === 'won' && 'border-green-300/50 bg-green-50/20 dark:bg-green-950/10',
                  status === 'lost' && 'border-red-200/50',
                )}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between border-b px-3 py-2.5">
                  <span className="text-sm font-semibold">{STATUS_LABEL_MAP[status]}</span>
                  <div className="flex items-center gap-1.5">
                    {overdueInCol > 0 && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0 h-4">
                        {overdueInCol} late
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">{columnLeads.length}</Badge>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex min-h-[350px] flex-1 flex-col gap-2 overflow-y-auto p-2">
                  {columnLeads.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-muted-foreground/20 p-4 text-center text-xs text-muted-foreground">
                      Drop leads here
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        today={today}
                        assignedName={assignedName(lead.assigned_to)}
                        onDragStart={(e) => handleDragStart(e, lead)}
                        onClick={() => setEditingLead(lead)}
                        onMarkContacted={(e) => handleMarkContacted(lead, e)}
                        isDragging={draggedLead?.id === lead.id}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Lead</DialogTitle>
            <p className="text-sm text-muted-foreground">Add a prospect to your pipeline. Set a follow-up date so nothing falls through.</p>
          </DialogHeader>
          <LeadFormInner
            platforms={platforms}
            profiles={profiles ?? []}
            assignableMembers={assignableMembers}
            initialStatus="new"
            today={today}
            onSubmit={handleAdd}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
            {editingLead?.follow_up_date && editingLead.follow_up_date < today && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Follow-up was due {editingLead.follow_up_date} — update it after responding.
              </p>
            )}
          </DialogHeader>
          {editingLead && (
            <>
              <LeadFormInner
                platforms={platforms}
                profiles={profiles ?? []}
                assignableMembers={assignableMembers}
                initialLead={editingLead}
                today={today}
                onSubmit={handleUpdate}
                onCancel={() => setEditingLead(null)}
              />
              <DialogFooter className="border-t pt-4">
                <Button variant="destructive" size="sm" onClick={handleDeleteClick}>
                  <Trash2 className="size-4 mr-1" aria-hidden /> Delete lead
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete lead</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Delete {editingLead?.client_name ?? 'this lead'}? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Lead Card ─────────────────────────────────────────────────────────────

const LeadCard = memo(function LeadCard({
  lead,
  today,
  assignedName,
  onDragStart,
  onClick,
  onMarkContacted,
  isDragging,
}: {
  lead: Lead
  today: string
  assignedName: string
  onDragStart: (e: React.DragEvent) => void
  onClick: () => void
  onMarkContacted: (e: React.MouseEvent) => void
  isDragging: boolean
}) {
  const followUpState = getFollowUpState(lead.follow_up_date, today)
  const isOverdue = followUpState === 'overdue'
  const isDueToday = followUpState === 'today'

  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        'cursor-grab active:cursor-grabbing border bg-card shadow-sm transition-all hover:shadow-md',
        isDragging && 'opacity-50 scale-95',
        isOverdue && 'border-red-400/60 bg-red-50/30 dark:bg-red-950/10',
        isDueToday && 'border-amber-400/60 bg-amber-50/20 dark:bg-amber-950/10',
      )}
    >
      {/* Red left stripe for overdue */}
      {isOverdue && (
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg bg-red-500" />
      )}

      <CardContent className="p-3 pl-4">
        <div className="flex items-start justify-between gap-1 mb-1">
          <p className="font-semibold text-sm leading-tight truncate flex-1" title={lead.client_name}>
            {lead.client_name}
          </p>
          {isOverdue && <AlertCircle className="size-3.5 text-red-500 shrink-0 mt-0.5" />}
        </div>

        {lead.company && (
          <p className="text-xs text-muted-foreground truncate mb-1.5">{lead.company}</p>
        )}

        <div className="flex flex-wrap items-center gap-1 mb-2">
          {lead.source_platform && (
            <Badge variant="outline" className="text-xs py-0">
              {lead.source_platform.display_name}
            </Badge>
          )}
          <span className="text-xs font-semibold text-primary">{formatCurrency(lead.estimated_value)}</span>
        </div>

        {/* Follow-up date */}
        {lead.follow_up_date && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium mb-2',
            isOverdue ? 'text-red-600 dark:text-red-400' :
            isDueToday ? 'text-amber-600 dark:text-amber-400' :
            'text-muted-foreground'
          )}>
            <Calendar className="size-3 shrink-0" />
            {isOverdue && `Follow-up overdue · ${lead.follow_up_date}`}
            {isDueToday && `Follow up today`}
            {followUpState === 'upcoming' && `Follow up ${lead.follow_up_date}`}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate">{assignedName}</p>
          {(isOverdue || isDueToday) && (
            <button
              type="button"
              onClick={onMarkContacted}
              className="shrink-0 text-xs font-medium text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
              title="Mark as contacted today"
            >
              Mark replied
            </button>
          )}
        </div>

        {lead.last_contacted_at && (
          <p className="text-xs text-muted-foreground mt-1">
            Last reply: {lead.last_contacted_at}
          </p>
        )}
      </CardContent>
    </Card>
  )
})

// ── Lead Form ─────────────────────────────────────────────────────────────

type LeadFormValues = {
  client_name: string
  email: string
  company: string
  source_platform_id: string
  source_profile_id: string
  status: LeadStatus
  assigned_to: string
  estimated_value: number
  notes: string
  follow_up_date: string
  last_contacted_at: string
}

function LeadFormInner({
  platforms,
  profiles,
  assignableMembers,
  initialLead,
  initialStatus,
  today,
  onSubmit,
  onCancel,
}: {
  platforms: { id: string; display_name: string }[]
  profiles: { id: string; name: string; platform_id: string }[]
  assignableMembers: { id: string; full_name: string }[]
  initialLead?: Lead
  initialStatus?: LeadStatus
  today: string
  onSubmit: (v: LeadFormValues) => Promise<void>
  onCancel: () => void
}) {
  const [client_name, setClient_name] = useState(initialLead?.client_name ?? '')
  const [email, setEmail] = useState(initialLead?.email ?? '')
  const [company, setCompany] = useState(initialLead?.company ?? '')
  const [source_platform_id, setSource_platform_id] = useState(initialLead?.source_platform_id ?? '')
  const [source_profile_id, setSource_profile_id] = useState(initialLead?.source_profile_id ?? '')
  const [status, setStatus] = useState<LeadStatus>(initialLead?.status ?? initialStatus ?? 'new')
  const [assigned_to, setAssigned_to] = useState(initialLead?.assigned_to ?? '')
  const [estimated_value, setEstimated_value] = useState(initialLead?.estimated_value ?? 0)
  const [notes, setNotes] = useState(initialLead?.notes ?? '')
  const [follow_up_date, setFollow_up_date] = useState(initialLead?.follow_up_date ?? '')
  const [last_contacted_at, setLast_contacted_at] = useState(initialLead?.last_contacted_at ?? '')
  const [saving, setSaving] = useState(false)

  const profilesForPlatform = source_platform_id
    ? profiles.filter((p) => p.platform_id === source_platform_id)
    : []

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!client_name.trim()) {
      toast.error('Enter client name')
      return
    }
    if (!source_platform_id?.trim()) {
      toast.error('Please select a source platform')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        client_name: client_name.trim(),
        email: email.trim() || '',
        company: company.trim() || '',
        source_platform_id,
        source_profile_id: source_profile_id || '',
        status,
        assigned_to: assigned_to || '',
        estimated_value: Number(estimated_value) || 0,
        notes: notes.trim() || '',
        follow_up_date: follow_up_date || '',
        last_contacted_at: last_contacted_at || '',
      })
    } finally {
      setSaving(false)
    }
  }

  // Quick-set follow-up shortcuts
  const setFollowUpIn = (days: number) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    setFollow_up_date(d.toISOString().slice(0, 10))
  }

  const isOverdue = follow_up_date && follow_up_date < today

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Core fields */}
      <div className="space-y-2">
        <Label>Client name *</Label>
        <Input value={client_name} onChange={(e) => setClient_name(e.target.value)} placeholder="Client or contact name" required autoFocus />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" />
        </div>
        <div className="space-y-2">
          <Label>Company</Label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" />
        </div>
      </div>

      {/* Separator */}
      <div className="border-t pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Follow-up Schedule</p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="follow-up-date">
              Follow-up date
              {isOverdue && (
                <span className="ml-2 text-xs font-medium text-red-600 dark:text-red-400">OVERDUE</span>
              )}
            </Label>
            <Input
              id="follow-up-date"
              type="date"
              value={follow_up_date}
              onChange={(e) => setFollow_up_date(e.target.value)}
              className={cn(isOverdue && 'border-red-400 focus-visible:ring-red-400')}
            />
            <div className="flex gap-1.5 flex-wrap">
              <span className="text-xs text-muted-foreground">Quick set:</span>
              {[
                { label: 'Tomorrow', days: 1 },
                { label: '2 days', days: 2 },
                { label: '1 week', days: 7 },
                { label: '2 weeks', days: 14 },
              ].map(({ label, days }) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setFollowUpIn(days)}
                  className="text-xs text-primary hover:underline underline-offset-2"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last-contacted">Last contacted date</Label>
            <Input
              id="last-contacted"
              type="date"
              value={last_contacted_at}
              onChange={(e) => setLast_contacted_at(e.target.value)}
              max={today}
            />
            <p className="text-xs text-muted-foreground">Update this every time you reply or follow up with them.</p>
          </div>
        </div>
      </div>

      {/* Pipeline details */}
      <div className="border-t pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Pipeline Details</p>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Source platform *</Label>
            <Select value={source_platform_id || undefined} onValueChange={(v) => { setSource_platform_id(v); setSource_profile_id('') }}>
              <SelectTrigger><SelectValue placeholder="Where did this lead come from?" /></SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {source_platform_id && (
            <div className="space-y-2">
              <Label>Source profile (optional)</Label>
              <Select value={source_profile_id || '__none__'} onValueChange={(v) => setSource_profile_id(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Any / Unknown</SelectItem>
                  {profilesForPlatform.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Assigned to</Label>
            <Select value={assigned_to || '__none__'} onValueChange={(v) => setAssigned_to(v === '__none__' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Assign to BD member" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {assignableMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estimated deal value ($)</Label>
            <Input
              type="number"
              min={0}
              value={estimated_value || ''}
              onChange={(e) => setEstimated_value(Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          {initialLead && (
            <div className="space-y-2">
              <Label>Pipeline stage</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as LeadStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key context, what was discussed, next steps..."
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Lead'}</Button>
      </DialogFooter>
    </form>
  )
}


