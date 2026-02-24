import { Link, useLocation } from 'react-router'
import {
  LayoutDashboard,
  CalendarCheck,
  History,
  Kanban,
  Users,
  UserCog,
  Target,
  FolderKanban,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ListTodo,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { useIncompleteWork } from '@/hooks/useIncompleteWork'
import { isSuperAdmin, isManagerOrSuperAdmin, isDeveloper } from '@/lib/roles'
import { Separator } from '@/components/ui/separator'

const navItems: { to: string; label: string; sublabel: string; icon: typeof LayoutDashboard; managerOrSuperAdminOnly?: boolean }[] = [
  { to: '/dashboard', label: 'Dashboard', sublabel: 'Your daily overview', icon: LayoutDashboard },
  { to: '/activities', label: 'Log Activity', sublabel: 'Fill today\'s numbers', icon: CalendarCheck },
  { to: '/activities/log', label: 'Activity History', sublabel: 'Past logged days', icon: History },
  { to: '/leads', label: 'Leads Pipeline', sublabel: 'Track prospects', icon: Kanban },
  { to: '/profiles', label: 'Accounts', sublabel: 'Managed profiles', icon: Users },
  { to: '/team', label: 'Team Members', sublabel: 'Manage BD team', icon: UserCog, managerOrSuperAdminOnly: true },
  { to: '/targets', label: 'Goals & Targets', sublabel: 'Performance targets', icon: Target },
  { to: '/projects', label: 'Projects', sublabel: 'Won projects', icon: FolderKanban },
  { to: '/dev/tasks', label: 'Assign Dev Tasks', sublabel: 'Assign tasks to developers', icon: ListTodo, managerOrSuperAdminOnly: true },
  { to: '/reports', label: 'Reports', sublabel: 'Analytics & export', icon: BarChart3 },
  { to: '/settings', label: 'Settings', sublabel: 'Account & appearance', icon: Settings, managerOrSuperAdminOnly: true },
]

const devNavItems: { to: string; label: string; sublabel: string; icon: typeof LayoutDashboard }[] = [
  { to: '/dashboard', label: 'Dashboard', sublabel: 'Check-in & overview', icon: LayoutDashboard },
  { to: '/dev/tasks', label: 'My Tasks', sublabel: 'Tasks assigned to you', icon: ListTodo },
  { to: '/projects', label: 'Projects', sublabel: 'Assigned projects', icon: FolderKanban },
]

export const Sidebar = () => {
  const location = useLocation()
  const { user } = useAuth()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const incomplete = useIncompleteWork()
  const canAccessManagerPages = isManagerOrSuperAdmin(user)
  const developer = isDeveloper(user)
  const items = developer
    ? devNavItems
    : navItems.filter((item) => !item.managerOrSuperAdminOnly || canAccessManagerPages)

  const getBadge = (to: string) => {
    if (to === '/dashboard' && !isSuperAdmin(user) && incomplete.incompleteCount > 0)
      return incomplete.incompleteCount
    if (to === '/activities' && user?.role === 'bd' && incomplete.activityIncomplete) return '!'
    if (to === '/targets' && incomplete.pendingTaskCount > 0) return incomplete.pendingTaskCount
    return null
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-in-out',
        sidebarOpen ? 'w-56' : 'w-16'
      )}
    >
      <div className="flex h-14 items-center justify-between gap-2 border-b border-sidebar-border px-3">
        {sidebarOpen && (
          <span className="truncate text-sm font-semibold">BD Salesforce</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="shrink-0"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </Button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-auto p-2">
        {items.map(({ to, label, sublabel, icon: Icon }) => {
          const isActive =
            to === '/dashboard'
              ? location.pathname.startsWith('/dashboard')
              : location.pathname === to ||
                (to !== '/activities' && location.pathname.startsWith(to + '/')) ||
                (to === '/activities' && location.pathname === '/activities')
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'relative flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/50 text-sidebar-foreground/80 hover:text-sidebar-foreground',
                !sidebarOpen && 'justify-center px-2'
              )}
              title={!sidebarOpen ? `${label} — ${sublabel}` : undefined}
              aria-label={!sidebarOpen ? label : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {sidebarOpen && (
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium leading-tight">{label}</p>
                    {getBadge(to) !== null && (
                      <Badge
                        variant={to === '/activities' && getBadge(to) === '!' ? 'destructive' : 'secondary'}
                        className="ml-auto h-5 min-w-5 px-1 text-[10px]"
                      >
                        {getBadge(to)}
                      </Badge>
                    )}
                  </div>
                  <p className="truncate text-[11px] text-sidebar-foreground/50 leading-tight mt-0.5">{sublabel}</p>
                </div>
              )}
              {!sidebarOpen && getBadge(to) !== null && (
                <span className="absolute right-1 top-1/2 -translate-y-1/2 size-2 rounded-full bg-destructive" aria-hidden />
              )}
            </Link>
          )
        })}
      </nav>
      <Separator className="shrink-0" />
    </aside>
  )
}
