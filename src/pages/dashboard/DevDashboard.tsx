import { Link } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LogIn, LogOut, ListTodo, FolderKanban, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useDevTasks } from '@/hooks/useDevTasks'
import { useDevAttendance } from '@/hooks/useDevAttendance'

export const DevDashboard = () => {
  const { user } = useAuth()
  const userId = user?.id ?? ''
  const today = new Date().toISOString().slice(0, 10)

  const { record, isLoading: attendanceLoading, checkIn, checkOut } = useDevAttendance(userId, today)
  const { tasks, isLoading: tasksLoading } = useDevTasks(userId)

  const pendingTasks = (tasks ?? []).filter((t) => !t.completed_at)
  const overdueTasks = pendingTasks.filter((t) => t.due_date < today)
  const dueTodayTasks = pendingTasks.filter((t) => t.due_date === today)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Developer Dashboard</h1>
        <p className="text-muted-foreground">Check in, track tasks, and view assigned projects.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="size-4" />
              Today&apos;s attendance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {attendanceLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {record?.check_in_at ? (
                    <span className="text-muted-foreground">
                      Check-in: {new Date(record.check_in_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Not checked in</span>
                  )}
                  {record?.check_out_at && (
                    <span className="text-muted-foreground">
                      Check-out: {new Date(record.check_out_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {!record?.check_in_at ? (
                    <Button onClick={() => checkIn()} className="gap-2">
                      <LogIn className="size-4" />
                      Check in
                    </Button>
                  ) : record?.check_out_at ? (
                    <span className="text-sm text-muted-foreground">Done for the day</span>
                  ) : (
                    <Button variant="outline" onClick={() => checkOut()} className="gap-2">
                      <LogOut className="size-4" />
                      Check out
                    </Button>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="size-4" />
              My tasks
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link to="/dev/tasks">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium">{pendingTasks.length}</span> pending
                  {overdueTasks.length > 0 && (
                    <span className="ml-2 text-destructive">({overdueTasks.length} overdue)</span>
                  )}
                </p>
                {dueTodayTasks.length > 0 && (
                  <p className="text-muted-foreground">{dueTodayTasks.length} due today</p>
                )}
                {pendingTasks.length === 0 && (
                  <p className="text-muted-foreground">No pending tasks</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderKanban className="size-4" />
            Assigned projects
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/projects">View projects</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            View and work on projects assigned to you by your manager.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
