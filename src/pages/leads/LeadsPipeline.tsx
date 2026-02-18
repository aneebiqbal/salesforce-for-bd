import { useState, useMemo, memo } from 'react'
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
import { LEAD_STATUSES } from '@/lib/constants'
import { formatCurrency, cn } from '@/lib/utils'
import type { Lead } from '@/types'
import type { LeadStatus } from '@/types'
import { Trash2 } from 'lucide-react'

const STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'proposal', 'interview', 'negotiation', 'won', 'lost']

export const LeadsPipeline = () => {
  const [addOpen, setAddOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null)

  const queryClient = useQueryClient()
  const { leads, isLoading, createLead, updateLead, deleteLead } = useLeads()
  const { platforms } = usePlatforms()
  const { profiles } = useProfiles(undefined)
  const { members: assignableMembers } = useAssignableMembers()

  const leadsByStatus = useMemo(() => {
    const map = new Map<LeadStatus, Lead[]>()
    for (const s of STATUS_ORDER) map.set(s, [])
    for (const lead of leads ?? []) {
      const list = map.get(lead.status as LeadStatus)
      if (list) list.push(lead)
    }
    return map
  }, [leads])

  const handleAdd = async (values: LeadFormValues) => {
    try {
      await createLead({
        client_name: values.client_name,
        email: values.email || null,
        company: values.company || null,
        source_platform_id: values.source_platform_id,
        source_profile_id: values.source_profile_id || null,
        status: values.status,
        assigned_to: values.assigned_to || null,
        estimated_value: values.estimated_value,
        notes: values.notes || null,
      })
      toast.success('Lead created')
      setAddOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create lead')
    }
  }

  const handleUpdate = async (values: LeadFormValues) => {
    if (!editingLead) return
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
          assigned_to: values.assigned_to || null,
          estimated_value: values.estimated_value,
          notes: values.notes || null,
        },
      })
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
      toast.error('Failed to move lead. It stayed in the original column.')
    }
  }

  const assignedName = (userId: string | null) =>
    userId ? assignableMembers.find((m) => m.id === userId)?.full_name ?? '—' : '—'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads Pipeline</h1>
          <p className="text-muted-foreground">Track and manage leads. Drag cards between columns.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>Add Lead</Button>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STATUS_ORDER.map((s) => (
            <Skeleton key={s} className="h-96 w-72 shrink-0 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {STATUS_ORDER.map((status) => {
            const columnLeads = leadsByStatus.get(status) ?? []
            const label = LEAD_STATUSES.find((x) => x.value === status)?.label ?? status
            return (
              <div
                key={status}
                className={cn(
                  'flex h-full min-h-[400px] w-72 shrink-0 flex-col rounded-lg border bg-muted/30 transition-colors',
                  dragOverStatus === status && 'border-primary bg-muted/50'
                )}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="flex items-center justify-between border-b p-3">
                  <span className="font-medium">{label}</span>
                  <Badge variant="secondary">{columnLeads.length}</Badge>
                </div>
                <div className="flex min-h-[320px] flex-1 flex-col space-y-2 overflow-y-auto p-2">
                  {columnLeads.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center rounded border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
                      No leads
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        assignedName={assignedName(lead.assigned_to)}
                        onDragStart={(e) => handleDragStart(e, lead)}
                        onClick={() => setEditingLead(lead)}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New lead</DialogTitle>
          </DialogHeader>
          <LeadFormInner
            platforms={platforms}
            profiles={profiles ?? []}
            assignableMembers={assignableMembers}
            initialStatus="new"
            onSubmit={handleAdd}
            onCancel={() => setAddOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingLead} onOpenChange={(open) => !open && setEditingLead(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit lead</DialogTitle>
          </DialogHeader>
          {editingLead && (
            <>
              <LeadFormInner
                platforms={platforms}
                profiles={profiles ?? []}
                assignableMembers={assignableMembers}
                initialLead={editingLead}
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

const LeadCard = memo(function LeadCard({
  lead,
  assignedName,
  onDragStart,
  onClick,
  isDragging,
}: {
  lead: Lead
  assignedName: string
  onDragStart: (e: React.DragEvent) => void
  onClick: () => void
  isDragging: boolean
}) {
  return (
    <Card
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cn(
        'cursor-grab active:cursor-grabbing border bg-card p-3 shadow-sm transition-shadow hover:shadow-md',
        isDragging && 'opacity-50'
      )}
    >
      <CardContent className="p-0">
        <p className="font-medium leading-tight truncate" title={lead.client_name}>{lead.client_name}</p>
        {lead.company && (
          <p className="text-xs text-muted-foreground truncate" title={lead.company}>{lead.company}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {lead.source_platform && (
            <Badge variant="outline" className="text-xs">
              {lead.source_platform.display_name}
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm font-medium text-primary">{formatCurrency(lead.estimated_value)}</p>
        <p className="text-xs text-muted-foreground">Assigned: {assignedName}</p>
        <p className="text-xs text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</p>
      </CardContent>
    </Card>
  )
})

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
}

function LeadFormInner({
  platforms,
  profiles,
  assignableMembers,
  initialLead,
  initialStatus,
  onSubmit,
  onCancel,
}: {
  platforms: { id: string; display_name: string }[]
  profiles: { id: string; name: string; platform_id: string }[]
  assignableMembers: { id: string; full_name: string }[]
  initialLead?: Lead
  initialStatus?: LeadStatus
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
  const [saving, setSaving] = useState(false)

  const profilesForPlatform = source_platform_id
    ? profiles.filter((p) => p.platform_id === source_platform_id)
    : []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!client_name.trim()) return
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
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Client name</Label>
        <Input value={client_name} onChange={(e) => setClient_name(e.target.value)} placeholder="Client name" required />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" />
        </div>
        <div className="space-y-2">
          <Label>Company</Label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Source platform</Label>
        <Select value={source_platform_id || undefined} onValueChange={(v) => { setSource_platform_id(v); setSource_profile_id('') }}>
          <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
          <SelectContent>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {source_platform_id && (
        <div className="space-y-2">
          <Label>Source profile</Label>
          <Select value={source_profile_id || '__none__'} onValueChange={(v) => setSource_profile_id(v === '__none__' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Optional</SelectItem>
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
          <SelectTrigger><SelectValue placeholder="Select BD member" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Unassigned</SelectItem>
            {assignableMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Estimated value ($)</Label>
        <Input type="number" min={0} value={estimated_value || ''} onChange={(e) => setEstimated_value(Number(e.target.value) || 0)} />
      </div>
      {initialLead && (
        <div className="space-y-2">
          <Label>Status</Label>
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
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes" rows={2} className="resize-none" />
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogFooter>
    </form>
  )
}

