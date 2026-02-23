import { Link } from 'react-router'
import { Bell, CheckCheck, ClipboardList, UserPlus, Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import type { Notification, NotificationType } from '@/types'
import { cn } from '@/lib/utils'

const TYPE_ICONS: Record<NotificationType, typeof ClipboardList> = {
  task_assigned: ClipboardList,
  lead_assigned: UserPlus,
  profile_assigned: Briefcase,
}

const TYPE_LABELS: Record<NotificationType, string> = {
  task_assigned: 'Task assigned',
  lead_assigned: 'Lead assigned',
  profile_assigned: 'Account assigned',
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60_000) return 'Just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleDateString()
}

export const NotificationDropdown = () => {
  const { user } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user?.id)

  const Icon = Bell

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Icon className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex flex-row items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 text-xs"
              onClick={() => void markAllRead()}
            >
              <CheckCheck className="size-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifications.slice(0, 10).map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onSelect={() => {
                void markRead(n.id)
              }}
            />
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotificationItem({
  notification,
  onSelect,
}: {
  notification: Notification
  onSelect: () => void
}) {
  const TypeIcon = TYPE_ICONS[notification.type]
  const link = notification.link || (notification.type === 'task_assigned' ? '/targets' : notification.type === 'lead_assigned' ? '/leads' : '/profiles')

  return (
    <DropdownMenuItem asChild onSelect={onSelect}>
      <Link
        to={link}
        className={cn(
          'flex gap-3 py-3',
          !notification.read_at && 'bg-primary/5'
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <TypeIcon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-medium', !notification.read_at && 'font-semibold')}>
            {notification.title}
          </p>
          {notification.message && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {notification.message}
            </p>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground">
            {TYPE_LABELS[notification.type]} · {formatTime(notification.created_at)}
          </p>
        </div>
      </Link>
    </DropdownMenuItem>
  )
}
