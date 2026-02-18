import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useAuth } from '@/hooks/useAuth'
import { useTargets } from '@/hooks/useTargets'
import { useActivities } from '@/hooks/useActivities'
import { usePlatforms } from '@/hooks/usePlatforms'
import { useAssignableMembers } from '@/hooks/useTeam'
import { TARGET_METRICS } from '@/lib/constants'
import type { Target } from '@/types'
import type { DailyActivity } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'

function sumMetric(activities: DailyActivity[], metric: string): number {
  return activities.reduce((sum, a) => sum + Number((a as unknown as Record<string, number>)[metric] ?? 0), 0)
}

export const TargetsPage = () => {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<Target | null>(null)

  const { targets, isLoading, upsertTarget, deleteTarget } = useTargets(isAdmin ? undefined : user?.id)
  const { platforms } = usePlatforms()
  const { members: assignableMembers } = useAssignableMembers()

  const yearStart = '2020-01-01'
  const yearEnd = '2030-12-31'
  const { activities } = useActivities(undefined, yearStart, yearEnd)

  const currentValueByTarget = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of targets ?? []) {
      const list = (activities ?? []).filter(
        (a) =>
          a.bd_member_id === t.bd_member_id &&
          a.activity_date >= t.start_date &&
          a.activity_date <= t.end_date
      )
      map.set(t.id, sumMetric(list, t.metric))
    }
    return map
  }, [targets, activities])

  const targetsByMember = useMemo(() => {
    const map = new Map<string, Target[]>()
    for (const t of targets ?? []) {
      const list = map.get(t.bd_member_id) ?? []
      list.push(t)
      map.set(t.bd_member_id, list)
    }
    return map
  }, [targets])

  const handleSave = async (values: TargetFormValues) => {
    // Duplicate check: same BD member + same metric + overlapping date range
    const overlap = (targets ?? []).find(
      (t) =>
        t.bd_member_id === values.bd_member_id &&
        t.metric === values.metric &&
        t.id !== editingTarget?.id &&
        t.start_date <= values.end_date &&
        t.end_date >= values.start_date
    )
    if (overlap) {
      toast.error(
        `A target for this metric already exists for this BD member with an overlapping date range (${overlap.start_date} → ${overlap.end_date}).`
      )
      return
    }
    try {
      if (editingTarget) {
        await upsertTarget({
          id: editingTarget.id,
          bd_member_id: values.bd_member_id,
          platform_id: values.platform_id || null,
          period: values.period,
          metric: values.metric,
          target_value: values.target_value,
          start_date: values.start_date,
          end_date: values.end_date,
        })
        toast.success('Target updated')
      } else {
        await upsertTarget({
          bd_member_id: values.bd_member_id,
          platform_id: values.platform_id || null,
          period: values.period,
          metric: values.metric,
          target_value: values.target_value,
          start_date: values.start_date,
          end_date: values.end_date,
        })
        toast.success('Target set')
      }
      setDialogOpen(false)
      setEditingTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteTarget(id)
      toast.success('Target deleted')
      setEditingTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const memberName = (id: string) => assignableMembers.find((m) => m.id === id)?.full_name ?? id.slice(0, 8)
  const platformName = (id: string | null) => (id ? platforms.find((p) => p.id === id)?.display_name ?? '—' : 'All')
  const metricLabel = (m: string) => TARGET_METRICS.find((x) => x.value === m)?.label ?? m

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Targets</h1>
          <p className="text-muted-foreground">Set and track weekly/monthly targets for BD members.</p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingTarget(null)
              setDialogOpen(true)
            }}
          >
            Set Target
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : targets?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">No targets configured.</p>
            {isAdmin && (
              <Button className="mt-3" onClick={() => setDialogOpen(true)}>
                Set Target
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Array.from(targetsByMember.entries()).map(([bdMemberId, memberTargets]) => (
            <Card key={bdMemberId}>
              <CardContent className="p-4">
                <h2 className="mb-3 font-medium">{memberName(bdMemberId)}</h2>
                <div className="space-y-3">
                  {memberTargets.map((t) => {
                    const current = currentValueByTarget.get(t.id) ?? 0
                    const pct = t.target_value > 0 ? Math.min(100, Math.max(0, (current / t.target_value) * 100)) : 0
                    const today = new Date().toISOString().slice(0, 10)
                    const isExpired = t.end_date < today
                    return (
                      <div
                        key={t.id}
                        className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{metricLabel(t.metric)}</span>
                          <div className="flex items-center gap-1.5">
                            {isExpired ? (
                              <Badge variant="secondary">Expired</Badge>
                            ) : pct >= 100 ? (
                              <Badge variant="default">Completed</Badge>
                            ) : (
                              <Badge variant="outline">{t.period}</Badge>
                            )}
                          </div>
                          {isAdmin && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => {
                                  setEditingTarget(t)
                                  setDialogOpen(true)
                                }}
                              >
                                <Pencil className="size-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-destructive"
                                onClick={() => handleDelete(t.id)}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {platformName(t.platform_id)} · {t.start_date} → {t.end_date}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            {current} / {t.target_value}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && (setDialogOpen(false), setEditingTarget(null))}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTarget ? 'Edit target' : 'Set target'}</DialogTitle>
          </DialogHeader>
          <TargetForm
            target={editingTarget}
            platforms={platforms}
            assignableMembers={assignableMembers}
            onSave={handleSave}
            onCancel={() => (setDialogOpen(false), setEditingTarget(null))}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

type TargetFormValues = {
  bd_member_id: string
  platform_id: string
  period: 'weekly' | 'monthly'
  metric: string
  target_value: number
  start_date: string
  end_date: string
}

function TargetForm({
  target,
  platforms,
  assignableMembers,
  onSave,
  onCancel,
}: {
  target: Target | null
  platforms: { id: string; display_name: string }[]
  assignableMembers: { id: string; full_name: string }[]
  onSave: (v: TargetFormValues) => Promise<void>
  onCancel: () => void
}) {
  const [bd_member_id, setBd_member_id] = useState(target?.bd_member_id ?? '')
  const [platform_id, setPlatform_id] = useState(target?.platform_id ?? '')
  const [period, setPeriod] = useState<'weekly' | 'monthly'>(target?.period ?? 'monthly')
  const [metric, setMetric] = useState(target?.metric ?? 'proposals_sent')
  const [target_value, setTarget_value] = useState(target?.target_value ?? 0)
  const [start_date, setStart_date] = useState(target?.start_date ?? '')
  const [end_date, setEnd_date] = useState(target?.end_date ?? '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!bd_member_id || !start_date || !end_date) return
    if (end_date < start_date) {
      toast.error('End date must be after start date')
      return
    }
    setSaving(true)
    try {
      await onSave({
        bd_member_id,
        platform_id: platform_id || '',
        period,
        metric,
        target_value: Number(target_value) || 0,
        start_date,
        end_date,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>BD Member</Label>
        <Select value={bd_member_id || undefined} onValueChange={setBd_member_id} required>
          <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
          <SelectContent>
            {assignableMembers.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Platform (optional)</Label>
        <Select value={platform_id || '__none__'} onValueChange={(v) => setPlatform_id(v === '__none__' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">All</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Metric</Label>
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TARGET_METRICS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Target value</Label>
        <Input type="number" min={0} value={target_value || ''} onChange={(e) => setTarget_value(Number(e.target.value) || 0)} />
      </div>
      <div className="space-y-2">
        <Label>Period</Label>
        <Select value={period} onValueChange={(v) => setPeriod(v as 'weekly' | 'monthly')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start date</Label>
          <Input type="date" value={start_date} onChange={(e) => setStart_date(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>End date</Label>
          <Input type="date" value={end_date} onChange={(e) => setEnd_date(e.target.value)} required />
        </div>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </DialogFooter>
    </form>
  )
}
