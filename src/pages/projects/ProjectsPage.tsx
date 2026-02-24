import { useState, useEffect } from 'react'
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
import { Link } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { useProjects } from '@/hooks/useProjects'
import { useProjectDevelopers } from '@/hooks/useProjectDevelopers'
import { useAssignableDevs } from '@/hooks/useTeam'
import { useLeads } from '@/hooks/useLeads'
import { PROJECT_STATUSES } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import type { Project, UserProfile } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'

export const ProjectsPage = () => {
  const { user } = useAuth()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const canCreateProjects = user?.role === 'super_admin' || user?.role === 'bd_manager'
  const canEditOrDeleteProjects = user?.role === 'super_admin'
  const { projects, isLoading, createProject, updateProject, deleteProject } = useProjects()
  const { syncDevelopers } = useProjectDevelopers(null)
  const { devs: assignableDevs } = useAssignableDevs()
  const { leads, isLoading: leadsLoading } = useLeads()
  const wonLeads = (leads ?? []).filter((l) => l.status === 'won')

  const handleSave = async (values: ProjectFormValues) => {
    try {
      const devNames = assignableDevs
        .filter((d: UserProfile) => (values.developer_ids ?? []).includes(d.id))
        .map((d: UserProfile) => d.full_name)
      let projectId: string
      if (editingProject) {
        await updateProject({
          id: editingProject.id,
          name: values.name,
          client_name: values.client_name,
          status: values.status,
          revenue: values.revenue,
          lead_id: values.lead_id || null,
          assigned_developers: devNames,
          start_date: values.start_date || null,
          end_date: values.end_date || null,
          notes: values.notes || null,
        })
        projectId = editingProject.id
        await syncDevelopers({ project_id: projectId, developer_ids: values.developer_ids ?? [] })
        toast.success('Project updated')
      } else {
        const created = await createProject({
          name: values.name,
          client_name: values.client_name,
          status: values.status,
          revenue: values.revenue,
          lead_id: values.lead_id || null,
          assigned_developers: devNames,
          start_date: values.start_date || null,
          end_date: values.end_date || null,
          notes: values.notes || null,
        })
        projectId = created.id
        await syncDevelopers({ project_id: projectId, developer_ids: values.developer_ids ?? [] })
        toast.success('Project created')
      }
      setDialogOpen(false)
      setEditingProject(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id)
      toast.success('Project deleted')
      setEditingProject(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const statusVariant = (status: string) =>
    status === 'active' ? 'default' : status === 'completed' ? 'secondary' : status === 'on_hold' ? 'outline' : 'destructive'
  const leadName = (leadId: string | null) => (leadId ? wonLeads.find((l) => l.id === leadId)?.client_name ?? '—' : '—')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Won leads and active projects.</p>
        </div>
        {canCreateProjects && (
          <Button
            onClick={() => {
              setEditingProject(null)
              setDialogOpen(true)
            }}
          >
            Add Project
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : projects?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No projects yet.</p>
            {canCreateProjects && (
              <Button className="mt-3" onClick={() => setDialogOpen(true)}>
                Add Project
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects?.map((project) => (
            <Card key={project.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium leading-tight">{project.name}</span>
                  <Badge variant={statusVariant(project.status)} className="capitalize shrink-0">
                    {project.status.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{project.client_name}</p>
                <p className="text-sm font-medium text-primary">{formatCurrency(project.revenue)}</p>
                {project.assigned_developers?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {project.assigned_developers.map((d) => (
                      <Badge key={d} variant="outline" className="text-xs">
                        {d}
                      </Badge>
                    ))}
                  </div>
                )}
                {project.lead_id && (
                  <p className="text-xs text-muted-foreground">
                    Linked lead:{' '}
                    <Link to="/leads" className="underline hover:text-foreground">
                      {leadName(project.lead_id)}
                    </Link>
                  </p>
                )}
                {(project.start_date || project.end_date) && (
                  <p className="text-xs text-muted-foreground">
                    {project.start_date ?? '—'} → {project.end_date ?? '—'}
                  </p>
                )}
                {project.notes && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">{project.notes}</p>
                )}
                {canEditOrDeleteProjects && (
                  <div className="mt-auto flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setEditingProject(project)
                        setDialogOpen(true)
                      }}
                    >
                      <Pencil className="size-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      aria-label="Delete project"
                      onClick={() => {
                        if (window.confirm(`Delete "${project.name}"? This cannot be undone.`)) {
                          handleDelete(project.id)
                        }
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && (setDialogOpen(false), setEditingProject(null))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit project' : 'Add project'}</DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={editingProject}
            wonLeads={wonLeads}
            leadsLoading={leadsLoading}
            onSave={handleSave}
            onCancel={() => (setDialogOpen(false), setEditingProject(null))}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

type ProjectFormValues = {
  name: string
  client_name: string
  status: Project['status']
  revenue: number
  lead_id: string
  assigned_developers: string
  developer_ids: string[]
  start_date: string
  end_date: string
  notes: string
}

function ProjectForm({
  project,
  wonLeads,
  leadsLoading,
  onSave,
  onCancel,
}: {
  project: Project | null
  wonLeads: { id: string; client_name: string; company: string | null }[]
  leadsLoading?: boolean
  onSave: (v: ProjectFormValues) => Promise<void>
  onCancel: () => void
}) {
  const { developerIds } = useProjectDevelopers(project?.id ?? null)
  const { devs: assignableDevs } = useAssignableDevs()

  const [name, setName] = useState(project?.name ?? '')
  const [client_name, setClient_name] = useState(project?.client_name ?? '')
  const [status, setStatus] = useState(project?.status ?? 'active')
  const [revenue, setRevenue] = useState(project?.revenue ?? 0)
  const [lead_id, setLead_id] = useState(project?.lead_id ?? '')
  const [developer_ids, setDeveloper_ids] = useState<string[]>([])
  const [start_date, setStart_date] = useState(project?.start_date ?? '')
  const [end_date, setEnd_date] = useState(project?.end_date ?? '')
  const [notes, setNotes] = useState(project?.notes ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!project) setDeveloper_ids([])
    else setDeveloper_ids(developerIds)
  }, [project?.id, developerIds.join(',')])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !client_name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        client_name: client_name.trim(),
        status: status as Project['status'],
        revenue: Number(revenue) || 0,
        lead_id: lead_id || '',
        assigned_developers: assignableDevs.filter((d: UserProfile) => developer_ids.includes(d.id)).map((d: UserProfile) => d.full_name).join(', '),
        developer_ids,
        start_date: start_date || '',
        end_date: end_date || '',
        notes: notes.trim() || '',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Project name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" required />
      </div>
      <div className="space-y-2">
        <Label>Client name</Label>
        <Input value={client_name} onChange={(e) => setClient_name(e.target.value)} placeholder="Client" required />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={status} onValueChange={(v) => setStatus(v as Project['status'])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PROJECT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Revenue ($)</Label>
        <Input type="number" min={0} step="0.01" value={revenue || ''} onChange={(e) => setRevenue(parseFloat(e.target.value) || 0)} />
      </div>
      <div className="space-y-2">
        <Label>Linked lead (won)</Label>
        <Select value={lead_id || '__none__'} onValueChange={(v) => setLead_id(v === '__none__' ? '' : v)} disabled={leadsLoading}>
          <SelectTrigger><SelectValue placeholder={leadsLoading ? 'Loading…' : 'None'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {wonLeads.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.client_name}{l.company ? ` — ${l.company}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Assign developers</Label>
        <div className="flex flex-wrap gap-3 rounded-md border p-3">
          {assignableDevs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No developers in your team. Add developers from Team and assign a manager.</p>
          ) : (
            assignableDevs.map((d: UserProfile) => (
              <label key={d.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={developer_ids.includes(d.id)}
                  onChange={(e) => {
                    if (e.target.checked) setDeveloper_ids((prev) => [...prev, d.id])
                    else setDeveloper_ids((prev) => prev.filter((id) => id !== d.id))
                  }}
                  className="rounded border-input"
                />
                <span className="text-sm">{d.full_name}</span>
              </label>
            ))
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start date</Label>
          <Input type="date" value={start_date} onChange={(e) => setStart_date(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>End date</Label>
          <Input type="date" value={end_date} onChange={(e) => setEnd_date(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="resize-none" />
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogFooter>
    </form>
  )
}
