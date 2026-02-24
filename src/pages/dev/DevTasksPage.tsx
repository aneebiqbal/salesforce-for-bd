import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  ListTodo,
  Plus,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDevTasks, type DevTaskInsert } from '@/hooks/useDevTasks'
import { useAssignableDevs } from '@/hooks/useTeam'
import { useProjects } from '@/hooks/useProjects'
import type { DevTask, UserProfile } from '@/types'
import { cn } from '@/lib/utils'

const todayStr = () => new Date().toISOString().slice(0, 10)

function TaskRow({
  task,
  onToggle,
  isDeveloper,
}: {
  task: DevTask
  onToggle: (t: DevTask) => void
  isDeveloper: boolean
}) {
  const isOverdue = !task.completed_at && task.due_date < todayStr()
  const dueToday = task.due_date === todayStr()

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 transition-colors',
        task.completed_at && 'opacity-60'
      )}
    >
      {isDeveloper && (
        <button
          type="button"
          onClick={() => onToggle(task)}
          className="mt-0.5 shrink-0 rounded p-0.5 hover:bg-muted"
          aria-label={task.completed_at ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed_at ? (
            <CheckCircle2 className="size-5 text-green-600" />
          ) : (
            <Circle className="size-5 text-muted-foreground" />
          )}
        </button>
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('font-medium', task.completed_at && 'line-through text-muted-foreground')}>
          {task.title}
        </p>
        {task.description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{task.description}</p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="size-3" />
            Due: {task.due_date}
            {task.due_time && ` ${task.due_time.slice(0, 5)}`}
          </span>
          {isOverdue && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="size-3" /> Overdue
            </span>
          )}
          {dueToday && !task.completed_at && !isOverdue && (
            <span className="text-amber-600 dark:text-amber-400">Due today</span>
          )}
        </div>
      </div>
    </div>
  )
}

export const DevTasksPage = () => {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const isDeveloper = user?.role === 'developer'
  const isManager = user?.role === 'bd_manager' || user?.role === 'super_admin'

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDevId, setSelectedDevId] = useState<string>('')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDueDate, setNewDueDate] = useState(todayStr())
  const [newProjectId, setNewProjectId] = useState<string>('')

  const { devs } = useAssignableDevs()
  const { projects } = useProjects()
  const { tasks, isLoading, createTask, toggleComplete } = useDevTasks(isDeveloper ? userId : selectedDevId || undefined)

  const pending = useMemo(() => (tasks ?? []).filter((t) => !t.completed_at), [tasks])
  const completed = useMemo(() => (tasks ?? []).filter((t) => t.completed_at), [tasks])
  const overdue = useMemo(() => pending.filter((t) => t.due_date < todayStr()), [pending])
  const dueToday = useMemo(() => pending.filter((t) => t.due_date === todayStr()), [pending])
  const upcoming = useMemo(() => pending.filter((t) => t.due_date > todayStr()), [pending])

  const handleCreateTask = async () => {
    if (!isManager || !selectedDevId || !newTitle.trim()) {
      toast.error('Select a developer and enter a title')
      return
    }
    try {
      const payload: DevTaskInsert = {
        dev_id: selectedDevId,
        assigned_by: userId,
        project_id: newProjectId || null,
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        due_date: newDueDate,
        due_time: null,
        completed_at: null,
      }
      await createTask(payload)
      toast.success('Task assigned')
      setDialogOpen(false)
      setNewTitle('')
      setNewDescription('')
      setNewDueDate(todayStr())
      setNewProjectId('')
      setSelectedDevId(devs[0]?.id ?? '')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create task')
    }
  }

  const handleToggle = (task: DevTask) => {
    toggleComplete(task).catch(() => toast.error('Failed to update'))
  }

  if (isDeveloper) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground">Tasks assigned to you. Complete them by the due date.</p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : (tasks ?? []).length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center">
              <ListTodo className="mx-auto size-8 text-muted-foreground/40" />
              <p className="mt-2 font-medium">No tasks assigned yet</p>
              <p className="text-sm text-muted-foreground">Your manager will assign tasks here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {overdue.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-destructive">Overdue ({overdue.length})</h2>
                <div className="space-y-2">
                  {overdue.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={handleToggle} isDeveloper />
                  ))}
                </div>
              </div>
            )}
            {dueToday.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
                  Due today ({dueToday.length})
                </h2>
                <div className="space-y-2">
                  {dueToday.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={handleToggle} isDeveloper />
                  ))}
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Upcoming</h2>
                <div className="space-y-2">
                  {upcoming.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={handleToggle} isDeveloper />
                  ))}
                </div>
              </div>
            )}
            {completed.length > 0 && (
              <div>
                <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Completed ({completed.length})</h2>
                <div className="space-y-2">
                  {completed.map((t) => (
                    <TaskRow key={t.id} task={t} onToggle={handleToggle} isDeveloper />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  if (!isManager) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">You don&apos;t have access to assign dev tasks.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Assign Dev Tasks</h1>
          <p className="text-muted-foreground">Assign tasks to developers with a due date. They must complete by the assigned time.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Assign task
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select developer</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedDevId || (devs[0]?.id ?? '')} onValueChange={setSelectedDevId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a developer" />
              </SelectTrigger>
              <SelectContent>
                {devs.map((d: UserProfile) => (
                  <SelectItem key={d.id} value={d.id}>
                    <span className="flex items-center gap-2">
                      <User className="size-4" />
                      {d.full_name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {devs.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">No developers in your team. Assign developers to yourself from Team.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedDevId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tasks for this developer</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (tasks ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet. Use &quot;Assign task&quot; to add one.</p>
            ) : (
              <div className="space-y-2">
                {(tasks ?? []).map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={() => {}} isDeveloper={false} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign task to developer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Developer</Label>
              <Select value={selectedDevId} onValueChange={setSelectedDevId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select developer" />
                </SelectTrigger>
                <SelectContent>
                  {devs.map((d: UserProfile) => (
                    <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dev-task-title">Title *</Label>
              <Input
                id="dev-task-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>
            <div>
              <Label htmlFor="dev-task-desc">Description</Label>
              <Input
                id="dev-task-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>
            <div>
              <Label htmlFor="dev-task-due">Due date *</Label>
              <Input
                id="dev-task-due"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Project (optional)</Label>
              <Select value={newProjectId || 'none'} onValueChange={(v) => setNewProjectId(v === 'none' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {(projects ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTask} disabled={!newTitle.trim() || !selectedDevId}>
              Assign task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
