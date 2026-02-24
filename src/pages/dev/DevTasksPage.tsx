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
  GripVertical,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { isDeveloper as isDevRole, isManagerOrSuperAdmin } from '@/lib/roles'
import { useDevTasks, type DevTaskInsert, DEV_TASKS_PAGE_SIZE } from '@/hooks/useDevTasks'
import { useAssignableDevs } from '@/hooks/useTeam'
import { useProjects } from '@/hooks/useProjects'
import { DEV_TASK_STATUSES } from '@/lib/constants'
import type { DevTask, DevTaskStatus, UserProfile } from '@/types'

const todayStr = () => new Date().toISOString().slice(0, 10)

function TaskCard({
  task,
  onMoveStatus,
  isDeveloper,
  devName,
}: {
  task: DevTask
  onMoveStatus: (taskId: string, status: DevTaskStatus) => void
  isDeveloper: boolean
  devName?: string
}) {
  const isOverdue = task.status !== 'completed' && task.due_date < todayStr()
  const dueToday = task.due_date === todayStr()

  return (
    <Card className="group shrink-0 border bg-card shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          {isDeveloper && (
            <span className="shrink-0 text-muted-foreground/50" aria-hidden>
              <GripVertical className="size-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm leading-tight">{task.title}</p>
            {task.description && (
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5">
                <Calendar className="size-3" />
                Due: {task.due_date}
                {task.due_time && ` ${String(task.due_time).slice(0, 5)}`}
              </span>
              {isOverdue && (
                <span className="flex items-center gap-0.5 text-destructive">
                  <AlertCircle className="size-3" /> Overdue
                </span>
              )}
              {dueToday && task.status !== 'completed' && !isOverdue && (
                <span className="text-amber-600 dark:text-amber-400">Due today</span>
              )}
            </div>
            {devName && (
              <p className="mt-1 text-xs text-muted-foreground">Assigned to: {devName}</p>
            )}
          </div>
        </div>
        {isDeveloper && (
          <div className="mt-2 pt-2 border-t">
            <Select
              value={task.status}
              onValueChange={(v) => onMoveStatus(task.id, v as DevTaskStatus)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEV_TASK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BoardColumn({
  status,
  tasks,
  onMoveStatus,
  isDeveloper,
  devName,
}: {
  status: DevTaskStatus
  tasks: DevTask[]
  onMoveStatus: (taskId: string, status: DevTaskStatus) => void
  isDeveloper: boolean
  devName?: string
}) {
  const config = DEV_TASK_STATUSES.find((s) => s.value === status) ?? { label: status, value: status }
  return (
    <div className="flex w-64 shrink-0 flex-col rounded-lg border bg-muted/30">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-semibold">
          {config.label}
          <span className="ml-1.5 text-muted-foreground">({tasks.length})</span>
        </h3>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-[120px] max-h-[calc(100vh-280px)]">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            onMoveStatus={onMoveStatus}
            isDeveloper={isDeveloper}
            devName={devName}
          />
        ))}
      </div>
    </div>
  )
}

export const DevTasksPage = () => {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const isDeveloper = isDevRole(user)
  const isManager = isManagerOrSuperAdmin(user)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDevId, setSelectedDevId] = useState<string>('')
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDueDate, setNewDueDate] = useState(todayStr())
  const [newProjectId, setNewProjectId] = useState<string>('')

  const { devs } = useAssignableDevs()
  const { projects } = useProjects()
  const { tasks, isLoading, createTask, updateStatus } = useDevTasks(
    isDeveloper ? userId : selectedDevId || undefined
  )

  const tasksByStatus = useMemo(() => {
    const map = new Map<DevTaskStatus, DevTask[]>()
    for (const s of DEV_TASK_STATUSES) map.set(s.value, [])
    for (const t of tasks ?? []) {
      const status = (t.status ?? 'backlog') as DevTaskStatus
      const list = map.get(status) ?? []
      list.push(t)
      map.set(status, list)
    }
    return map
  }, [tasks])

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
        status: 'backlog',
        completed_at: null,
      }
      await createTask(payload)
      toast.success('Task assigned to Backlog')
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

  const handleMoveStatus = (taskId: string, status: DevTaskStatus) => {
    updateStatus(taskId, status).catch(() => toast.error('Failed to update status'))
  }

  const selectedDevName = useMemo(
    () => devs.find((d: UserProfile) => d.id === selectedDevId)?.full_name,
    [devs, selectedDevId]
  )

  if (isDeveloper) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Tasks</h1>
          <p className="text-muted-foreground">
            Move tickets across the board. New tasks start in Backlog.
          </p>
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 w-64 shrink-0 rounded-lg" />
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
          <>
            {(tasks?.length ?? 0) >= DEV_TASKS_PAGE_SIZE && (
              <p className="text-xs text-muted-foreground">
                Showing latest {DEV_TASKS_PAGE_SIZE} tasks. Complete or archive older ones to see more.
              </p>
            )}
            <div className="flex gap-3 overflow-x-auto pb-2">
              {DEV_TASK_STATUSES.map((s) => (
                <BoardColumn
                  key={s.value}
                  status={s.value}
                  tasks={tasksByStatus.get(s.value) ?? []}
                  onMoveStatus={handleMoveStatus}
                  isDeveloper
                />
              ))}
            </div>
          </>
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
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dev Task Board</h1>
          <p className="text-muted-foreground">
            Assign tasks and watch tickets move. Select a developer to see their board.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2 shrink-0">
          <Plus className="size-4" />
          Assign task
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Developer</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedDevId || (devs[0]?.id ?? '')}
            onValueChange={setSelectedDevId}
          >
            <SelectTrigger className="w-full max-w-xs">
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
            <p className="mt-2 text-sm text-muted-foreground">
              No developers in your team. Assign developers to yourself from Team.
            </p>
          )}
        </CardContent>
      </Card>

      {selectedDevId && (
        <>
          {(tasks?.length ?? 0) >= DEV_TASKS_PAGE_SIZE && (
            <p className="text-xs text-muted-foreground">
              Showing latest {DEV_TASKS_PAGE_SIZE} tasks for this developer.
            </p>
          )}
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-64 w-64 shrink-0 rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {DEV_TASK_STATUSES.map((s) => (
                <BoardColumn
                  key={s.value}
                  status={s.value}
                  tasks={tasksByStatus.get(s.value) ?? []}
                  onMoveStatus={() => {}}
                  isDeveloper={false}
                  devName={selectedDevName}
                />
              ))}
            </div>
          )}
        </>
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
