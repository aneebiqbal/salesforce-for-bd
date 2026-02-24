import React, { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { isManagerOrSuperAdmin } from '@/lib/roles'
import { useTargets } from '@/hooks/useTargets'
import { createNotification } from '@/hooks/useNotifications'
import { useActivities } from '@/hooks/useActivities'
import { usePlatforms } from '@/hooks/usePlatforms'
import { useAssignableMembers } from '@/hooks/useTeam'
import { useTasks, type Task, type TaskInsert } from '@/hooks/useTasks'
import { TARGET_METRICS } from '@/lib/constants'
import type { Target } from '@/types'
import type { DailyActivity } from '@/types'
import {
  Pencil, Trash2, CheckCircle2, Circle, Plus,
  Flag, Calendar, RotateCcw, Target as TargetIcon,
  ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function sumMetric(activities: DailyActivity[], metric: string): number {
  return activities.reduce((sum, a) => sum + Number((a as unknown as Record<string, number>)[metric] ?? 0), 0)
}

const PRIORITY_COLORS = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const REPEAT_LABELS: Record<string, string> = {
  none: 'One-time',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export const TargetsPage = () => {
  const { user } = useAuth()
  const canManageTargets = isManagerOrSuperAdmin(user)
  const today = new Date().toISOString().slice(0, 10)

  // Targets state
  const [targetDialogOpen, setTargetDialogOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<Target | null>(null)

  // Tasks state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)

  const { targets, isLoading: targetsLoading, upsertTarget, deleteTarget } = useTargets(canManageTargets ? undefined : user?.id)
  const { platforms } = usePlatforms()
  const { members: assignableMembers } = useAssignableMembers()

  const { tasks, isLoading: tasksLoading, createTask, updateTask, deleteTask, toggleComplete } = useTasks(
    canManageTargets ? undefined : user?.id
  )

  // Activities for target progress
  const now = new Date()
  const yearStart = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().slice(0, 10)
  const yearEnd = now.toISOString().slice(0, 10)
  const { activities } = useActivities(undefined, yearStart, yearEnd)

  const currentValueByTarget = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of targets ?? []) {
      const list = (activities ?? []).filter(
        (a) => a.bd_member_id === t.bd_member_id && a.activity_date >= t.start_date && a.activity_date <= t.end_date
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

  // Task grouping
  const { overdue, dueToday, upcoming, completed } = useMemo(() => {
    const overdue: Task[] = []
    const dueToday: Task[] = []
    const upcoming: Task[] = []
    const completed: Task[] = []
    for (const t of tasks) {
      if (t.completed_at) { completed.push(t); continue }
      if (!t.due_date) { upcoming.push(t); continue }
      if (t.due_date < today) overdue.push(t)
      else if (t.due_date === today) dueToday.push(t)
      else upcoming.push(t)
    }
    return { overdue, dueToday, upcoming, completed }
  }, [tasks, today])

  const handleSaveTarget = async (values: TargetFormValues) => {
    const overlap = (targets ?? []).find(
      (t) =>
        t.bd_member_id === values.bd_member_id &&
        t.metric === values.metric &&
        t.id !== editingTarget?.id &&
        t.start_date <= values.end_date &&
        t.end_date >= values.start_date
    )
    if (overlap) {
      toast.error(`A target for this metric already exists with overlapping dates (${overlap.start_date} → ${overlap.end_date}).`)
      return
    }
    try {
      if (editingTarget) {
        await upsertTarget({ id: editingTarget.id, ...values, platform_id: values.platform_id || null })
        toast.success('Target updated')
      } else {
        await upsertTarget({ ...values, platform_id: values.platform_id || null })
        toast.success('Target set')
      }
      setTargetDialogOpen(false)
      setEditingTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    }
  }

  const handleDeleteTarget = async (id: string) => {
    if (!window.confirm('Delete this target?')) return
    try {
      await deleteTarget(id)
      toast.success('Target deleted')
      setEditingTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const handleSaveTask = async (values: TaskFormValues) => {
    const assigneeId = values.bd_member_id || user?.id || ''
    const payload: TaskInsert = {
      bd_member_id: assigneeId,
      title: values.title,
      description: values.description || null,
      priority: values.priority,
      repeat: values.repeat,
      due_date: values.due_date || null,
      completed_at: null,
    }
    try {
      if (editingTask) {
        await updateTask({ id: editingTask.id, ...payload })
        toast.success('Task updated')
      } else {
        await createTask(payload)
        toast.success('Task added')
      }
      if (canManageTargets && assigneeId && assigneeId !== user?.id) {
        await createNotification({
          user_id: assigneeId,
          type: 'task_assigned',
          title: 'New task assigned to you',
          message: values.title + (values.due_date ? ` (due ${values.due_date})` : ''),
          link: '/targets',
        })
      }
      setTaskDialogOpen(false)
      setEditingTask(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save task')
    }
  }

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id)
      toast.success('Task deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const memberName = (id: string) => assignableMembers.find((m) => m.id === id)?.full_name ?? id.slice(0, 8)
  const platformName = (id: string | null) => (id ? platforms.find((p) => p.id === id)?.display_name ?? '—' : 'All platforms')
  const metricLabel = (m: string) => TARGET_METRICS.find((x) => x.value === m)?.label ?? m

  const pendingTaskCount = overdue.length + dueToday.length + upcoming.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals & Tasks</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage daily tasks, research to-dos, and performance targets.
        </p>
      </div>

      <Tabs defaultValue="tasks">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList>
            <TabsTrigger value="tasks" className="gap-2">
              <ClipboardList className="size-4" />
              Tasks
              {pendingTaskCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">
                  {pendingTaskCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="targets" className="gap-2">
              <TargetIcon className="size-4" />
              Performance Targets
            </TabsTrigger>
          </TabsList>

          <div>
            <TabsContent value="tasks" className="mt-0">
              <Button size="sm" className="gap-2" onClick={() => { setEditingTask(null); setTaskDialogOpen(true) }}>
                <Plus className="size-4" /> Add Task
              </Button>
            </TabsContent>
            <TabsContent value="targets" className="mt-0">
              {canManageTargets && (
                <Button size="sm" className="gap-2" onClick={() => { setEditingTarget(null); setTargetDialogOpen(true) }}>
                  <Plus className="size-4" /> Set Target
                </Button>
              )}
            </TabsContent>
          </div>
        </div>

        {/* ── TASKS TAB ── */}
        <TabsContent value="tasks" className="mt-5 space-y-5">
          {tasksLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          ) : tasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center space-y-3">
                <ClipboardList className="mx-auto size-8 text-muted-foreground/40" />
                <div>
                  <p className="font-medium">No tasks yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add tasks like "Research client X", "Check Upwork account", or "Follow up with lead".
                    Set deadlines and repeat schedules to stay organized.
                  </p>
                </div>
                <Button size="sm" onClick={() => { setEditingTask(null); setTaskDialogOpen(true) }}>
                  Add your first task
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overdue */}
              {overdue.length > 0 && (
                <TaskGroup
                  title={`Overdue (${overdue.length})`}
                  titleClass="text-red-600 dark:text-red-400"
                  tasks={overdue}
                  memberName={memberName}
                  onToggle={(t) => toggleComplete(t).catch(() => toast.error('Failed to update'))}
                  onEdit={(t) => { setEditingTask(t); setTaskDialogOpen(true) }}
                  onDelete={handleDeleteTask}
                />
              )}

              {/* Due today */}
              {dueToday.length > 0 && (
                <TaskGroup
                  title={`Due Today (${dueToday.length})`}
                  titleClass="text-amber-600 dark:text-amber-400"
                  tasks={dueToday}
                  memberName={memberName}
                  onToggle={(t) => toggleComplete(t).catch(() => toast.error('Failed to update'))}
                  onEdit={(t) => { setEditingTask(t); setTaskDialogOpen(true) }}
                  onDelete={handleDeleteTask}
                />
              )}

              {/* Upcoming */}
              {upcoming.length > 0 && (
                <TaskGroup
                  title="Upcoming"
                  tasks={upcoming}
                  memberName={memberName}
                  onToggle={(t) => toggleComplete(t).catch(() => toast.error('Failed to update'))}
                  onEdit={(t) => { setEditingTask(t); setTaskDialogOpen(true) }}
                  onDelete={handleDeleteTask}
                />
              )}

              {/* Completed */}
              {completed.length > 0 && (
                <TaskGroup
                  title={`Completed (${completed.length})`}
                  titleClass="text-muted-foreground"
                  tasks={completed}
                  memberName={memberName}
                  onToggle={(t) => toggleComplete(t).catch(() => toast.error('Failed to update'))}
                  onEdit={(t) => { setEditingTask(t); setTaskDialogOpen(true) }}
                  onDelete={handleDeleteTask}
                />
              )}
            </>
          )}
        </TabsContent>

        {/* ── TARGETS TAB ── */}
        <TabsContent value="targets" className="mt-5">
          {targetsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : targets?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center space-y-3">
                <TargetIcon className="mx-auto size-8 text-muted-foreground/40" />
                <div>
                  <p className="font-medium">No performance targets set</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {canManageTargets
                      ? 'Set weekly or monthly targets for each BD member — proposals sent, leads created, etc.'
                      : 'Ask your admin to set performance targets for you.'}
                  </p>
                </div>
                {canManageTargets && (
                  <Button size="sm" onClick={() => setTargetDialogOpen(true)}>
                    Set first target
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-5">
              {Array.from(targetsByMember.entries()).map(([bdMemberId, memberTargets]) => {
                const activeTargets = memberTargets.filter((t) => t.start_date <= today && t.end_date >= today)
                const expiredTargets = memberTargets.filter((t) => t.end_date < today)
                const futureTargets = memberTargets.filter((t) => t.start_date > today)
                return (
                  <div key={bdMemberId}>
                    <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
                      {memberName(bdMemberId)}
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {activeTargets.map((t) => (
                        <TargetCard
                          key={t.id}
                          target={t}
                          current={currentValueByTarget.get(t.id) ?? 0}
                          metricLabel={metricLabel(t.metric)}
                          platformName={platformName(t.platform_id)}
                          isAdmin={canManageTargets}
                          onEdit={() => { setEditingTarget(t); setTargetDialogOpen(true) }}
                          onDelete={() => handleDeleteTarget(t.id)}
                        />
                      ))}
                      {futureTargets.map((t) => (
                        <TargetCard
                          key={t.id}
                          target={t}
                          current={0}
                          metricLabel={metricLabel(t.metric)}
                          platformName={platformName(t.platform_id)}
                          isAdmin={canManageTargets}
                          onEdit={() => { setEditingTarget(t); setTargetDialogOpen(true) }}
                          onDelete={() => handleDeleteTarget(t.id)}
                          isFuture
                        />
                      ))}
                      {expiredTargets.map((t) => (
                        <TargetCard
                          key={t.id}
                          target={t}
                          current={currentValueByTarget.get(t.id) ?? 0}
                          metricLabel={metricLabel(t.metric)}
                          platformName={platformName(t.platform_id)}
                          isAdmin={canManageTargets}
                          onEdit={() => { setEditingTarget(t); setTargetDialogOpen(true) }}
                          onDelete={() => handleDeleteTarget(t.id)}
                          isExpired
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Task dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={(open) => { if (!open) { setTaskDialogOpen(false); setEditingTask(null) } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Add a research task, account check, or any daily/recurring to-do.
            </p>
          </DialogHeader>
          <TaskForm
            task={editingTask}
            assignableMembers={canManageTargets ? assignableMembers : []}
            currentUserId={user?.id ?? ''}
            isAdmin={canManageTargets}
            onSave={handleSaveTask}
            onCancel={() => { setTaskDialogOpen(false); setEditingTask(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Target dialog */}
      <Dialog open={targetDialogOpen} onOpenChange={(open) => { if (!open) { setTargetDialogOpen(false); setEditingTarget(null) } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTarget ? 'Edit Target' : 'Set Performance Target'}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Set a measurable outreach goal — proposals sent, leads created, etc. — for a specific period.
            </p>
          </DialogHeader>
          <TargetForm
            target={editingTarget}
            platforms={platforms}
            assignableMembers={assignableMembers}
            onSave={handleSaveTarget}
            onCancel={() => { setTargetDialogOpen(false); setEditingTarget(null) }}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Task Group ──────────────────────────────────────────────────────────────

function TaskGroup({
  title,
  titleClass,
  tasks,
  memberName,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string
  titleClass?: string
  tasks: Task[]
  memberName: (id: string) => string
  onToggle: (t: Task) => void
  onEdit: (t: Task) => void
  onDelete: (id: string) => void
}) {
  return (
    <div>
      <h3 className={cn('text-xs font-semibold uppercase tracking-widest mb-2', titleClass ?? 'text-foreground')}>
        {title}
      </h3>
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            memberName={memberName(task.bd_member_id)}
            onToggle={() => onToggle(task)}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task.id)}
          />
        ))}
      </div>
    </div>
  )
}

function TaskRow({
  task,
  memberName,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task
  memberName: string
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const done = !!task.completed_at
  const isOverdue = !done && task.due_date && task.due_date < new Date().toISOString().slice(0, 10)

  return (
    <div className={cn(
      'flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors',
      done ? 'bg-muted/30 border-border/50' :
      isOverdue ? 'border-red-300/60 bg-red-50/30 dark:border-red-800/40 dark:bg-red-950/10' :
      'bg-card border-border hover:bg-muted/20'
    )}>
      <button
        type="button"
        onClick={onToggle}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={done ? 'Mark incomplete' : 'Mark complete'}
      >
        {done
          ? <CheckCircle2 className="size-5 text-green-600" />
          : <Circle className="size-5" />
        }
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className={cn('text-sm font-medium', done && 'line-through text-muted-foreground')}>
            {task.title}
          </p>
          {!done && (
            <Badge variant="secondary" className={cn('text-xs capitalize', PRIORITY_COLORS[task.priority])}>
              <Flag className="size-2.5 mr-1" />
              {task.priority}
            </Badge>
          )}
          {task.repeat !== 'none' && (
            <Badge variant="outline" className="text-xs gap-1">
              <RotateCcw className="size-2.5" />
              {REPEAT_LABELS[task.repeat]}
            </Badge>
          )}
        </div>
        {task.description && (
          <p className={cn('text-xs mt-0.5', done ? 'text-muted-foreground/60 line-through' : 'text-muted-foreground')}>
            {task.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
          {task.due_date && (
            <span className={cn('flex items-center gap-1', isOverdue && !done && 'text-red-600 dark:text-red-400 font-medium')}>
              <Calendar className="size-3" />
              {isOverdue && !done ? `Overdue · ${task.due_date}` : task.due_date}
            </span>
          )}
          <span>{memberName}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onEdit}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Edit task"
        >
          <Pencil className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
          aria-label="Delete task"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Target Card ─────────────────────────────────────────────────────────────

function TargetCard({
  target,
  current,
  metricLabel,
  platformName,
  isAdmin,
  onEdit,
  onDelete,
  isExpired = false,
  isFuture = false,
}: {
  target: Target
  current: number
  metricLabel: string
  platformName: string
  isAdmin: boolean
  onEdit: () => void
  onDelete: () => void
  isExpired?: boolean
  isFuture?: boolean
}) {
  const pct = target.target_value > 0
    ? Math.min(100, Math.max(0, (current / target.target_value) * 100))
    : 0
  const remaining = Math.max(0, target.target_value - current)
  const reached = pct >= 100

  return (
    <Card className={cn(
      'relative overflow-hidden',
      isExpired && 'opacity-60',
      reached && !isExpired && 'border-green-500/40 bg-green-50/20 dark:bg-green-950/10'
    )}>
      {/* Top color bar */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1',
        reached ? 'bg-green-500' :
        pct >= 50 ? 'bg-primary' :
        isFuture ? 'bg-muted' : 'bg-amber-400'
      )} />
      <CardContent className="p-4 pt-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="font-semibold capitalize text-sm">{metricLabel}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {platformName} · {target.period} · {target.start_date} → {target.end_date}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {isExpired && <Badge variant="secondary" className="text-xs">Expired</Badge>}
            {isFuture && <Badge variant="outline" className="text-xs">Upcoming</Badge>}
            {reached && !isExpired && <Badge className="text-xs bg-green-600">Reached ✓</Badge>}
            {isAdmin && (
              <>
                <button type="button" onClick={onEdit} className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                  <Pencil className="size-3.5" />
                </button>
                <button type="button" onClick={onDelete} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-muted transition-colors">
                  <Trash2 className="size-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {!isFuture && (
          <>
            <div className="flex items-end justify-between gap-2 mb-2">
              <div>
                <p className="text-3xl font-bold tabular-nums leading-none">{current.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-0.5">of {target.target_value.toLocaleString()}</p>
              </div>
              {!reached && (
                <p className="text-sm font-medium text-muted-foreground">
                  {remaining.toLocaleString()} to go
                </p>
              )}
            </div>
            <Progress value={pct} className="h-2 mb-1.5" />
            <p className={cn(
              'text-xs font-medium',
              reached ? 'text-green-600 dark:text-green-400' :
              pct >= 50 ? 'text-primary' : 'text-amber-600 dark:text-amber-400'
            )}>
              {reached ? 'Target reached!' : `${pct.toFixed(0)}% complete`}
            </p>
          </>
        )}
        {isFuture && (
          <p className="text-sm text-muted-foreground">
            Starts {target.start_date} · Goal: {target.target_value.toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ── Task Form ───────────────────────────────────────────────────────────────

type TaskFormValues = {
  bd_member_id: string
  title: string
  description: string
  priority: Task['priority']
  repeat: Task['repeat']
  due_date: string
}

function TaskForm({
  task,
  assignableMembers,
  currentUserId,
  isAdmin,
  onSave,
  onCancel,
}: {
  task: Task | null
  assignableMembers: { id: string; full_name: string }[]
  currentUserId: string
  isAdmin: boolean
  onSave: (v: TaskFormValues) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'medium')
  const [repeat, setRepeat] = useState<Task['repeat']>(task?.repeat ?? 'none')
  const [due_date, setDue_date] = useState(task?.due_date ?? '')
  const [bd_member_id, setBd_member_id] = useState(task?.bd_member_id ?? currentUserId)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      await onSave({ bd_member_id, title: title.trim(), description, priority, repeat, due_date })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Task title</Label>
        <Input
          id="task-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Research client Acme Corp, Check Upwork messages"
          required
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="task-desc">Description (optional)</Label>
        <Textarea
          id="task-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add any notes or context for this task"
          rows={2}
          className="resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as Task['priority'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Repeat</Label>
          <Select value={repeat} onValueChange={(v) => setRepeat(v as Task['repeat'])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">One-time</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="task-due">Due date (optional)</Label>
        <Input
          id="task-due"
          type="date"
          value={due_date}
          onChange={(e) => setDue_date(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">Leave blank for no deadline.</p>
      </div>
      {isAdmin && assignableMembers.length > 0 && (
        <div className="space-y-2">
          <Label>Assign to</Label>
          <Select value={bd_member_id} onValueChange={setBd_member_id}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {assignableMembers.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Task'}</Button>
      </DialogFooter>
    </form>
  )
}

// ── Target Form ─────────────────────────────────────────────────────────────

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

  // Auto-set end date when period changes and start_date is set
  const handlePeriodChange = (p: 'weekly' | 'monthly') => {
    setPeriod(p)
    if (start_date) {
      const d = new Date(start_date + 'T12:00:00')
      if (p === 'weekly') d.setDate(d.getDate() + 6)
      else { d.setMonth(d.getMonth() + 1); d.setDate(d.getDate() - 1) }
      setEnd_date(d.toISOString().slice(0, 10))
    }
  }

  const handleStartDateChange = (v: string) => {
    setStart_date(v)
    if (v) {
      const d = new Date(v + 'T12:00:00')
      if (period === 'weekly') d.setDate(d.getDate() + 6)
      else { d.setMonth(d.getMonth() + 1); d.setDate(d.getDate() - 1) }
      setEnd_date(d.toISOString().slice(0, 10))
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!bd_member_id || !start_date || !end_date) return
    if (end_date < start_date) { toast.error('End date must be after start date'); return }
    setSaving(true)
    try {
      await onSave({ bd_member_id, platform_id: platform_id || '', period, metric, target_value: Number(target_value) || 0, start_date, end_date })
    } finally {
      setSaving(false)
    }
  }

  const metricInfo = TARGET_METRICS.find((m) => m.value === metric)

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
        <Label>Metric to track</Label>
        <Select value={metric} onValueChange={setMetric}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {TARGET_METRICS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {metricInfo && (
          <p className="text-xs text-muted-foreground">Tracked from daily activity logs.</p>
        )}
      </div>
      <div className="space-y-2">
        <Label>Target value</Label>
        <Input
          type="number"
          min={1}
          value={target_value || ''}
          onChange={(e) => setTarget_value(Number(e.target.value) || 0)}
          placeholder="e.g. 50 proposals"
        />
      </div>
      <div className="space-y-2">
        <Label>Period</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={period === 'weekly' ? 'default' : 'outline'}
            onClick={() => handlePeriodChange('weekly')}
          >
            Weekly
          </Button>
          <Button
            type="button"
            variant={period === 'monthly' ? 'default' : 'outline'}
            onClick={() => handlePeriodChange('monthly')}
          >
            Monthly
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start date</Label>
          <Input type="date" value={start_date} onChange={(e) => handleStartDateChange(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label>End date</Label>
          <Input type="date" value={end_date} onChange={(e) => setEnd_date(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Platform (optional)</Label>
        <Select value={platform_id || '__none__'} onValueChange={(v) => setPlatform_id(v === '__none__' ? '' : v)}>
          <SelectTrigger><SelectValue placeholder="All platforms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">All platforms</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Target'}</Button>
      </DialogFooter>
    </form>
  )
}

