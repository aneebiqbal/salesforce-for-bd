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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/uiStore'
import { useAuth } from '@/hooks/useAuth'
import { Separator } from '@/components/ui/separator'

const navItems: { to: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/activities', label: 'Daily Activity', icon: CalendarCheck },
  { to: '/activities/log', label: 'Activity Log', icon: History },
  { to: '/leads', label: 'Leads Pipeline', icon: Kanban },
  { to: '/profiles', label: 'Profiles', icon: Users },
  { to: '/team', label: 'Team', icon: UserCog, adminOnly: true },
  { to: '/targets', label: 'Targets', icon: Target },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export const Sidebar = () => {
  const location = useLocation()
  const { user } = useAuth()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const isAdmin = user?.role === 'admin'
  const items = navItems.filter((item) => !item.adminOnly || isAdmin)

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
      <nav className="flex-1 space-y-1 overflow-auto p-2">
        {items.map(({ to, label, icon: Icon }) => {
          // Exact match OR starts-with-slash for sub-routes (e.g. /activities/log matches /activities/log not /activities)
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
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent/50',
                !sidebarOpen && 'justify-center px-2'
              )}
              title={!sidebarOpen ? label : undefined}
              aria-label={!sidebarOpen ? label : undefined}
            >
              <Icon className="size-5 shrink-0" />
              {sidebarOpen && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>
      <Separator className="shrink-0" />
    </aside>
  )
}
