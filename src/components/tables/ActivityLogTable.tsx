import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { ActivityLogRow } from '@/hooks/useActivityLog'
import { cn } from '@/lib/utils'

interface ActivityLogTableProps {
  rows: ActivityLogRow[]
  isLoading?: boolean
  onRowClick?: (row: ActivityLogRow) => void
}

export const ActivityLogTable = ({ rows, isLoading, onRowClick }: ActivityLogTableProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }
  if (rows.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No activities found
      </div>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>BD Member</TableHead>
          <TableHead>Profile</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead className="text-right">Actions</TableHead>
          <TableHead className="text-right">Response %</TableHead>
          <TableHead className="text-center">Status</TableHead>
          <TableHead className="max-w-[180px]">Other work</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className={onRowClick ? 'cursor-pointer' : ''}
            onClick={() => onRowClick?.(row)}
          >
            <TableCell className="font-medium whitespace-nowrap">{row.activity_date}</TableCell>
            <TableCell>{row.bd_member_name}</TableCell>
            <TableCell className="max-w-[140px] truncate" title={row.profile_name}>{row.profile_name}</TableCell>
            <TableCell>
              <Badge variant="outline" className="font-normal text-xs">
                {row.platform_display_name}
              </Badge>
            </TableCell>
            <TableCell className="text-right tabular-nums font-medium">{row.total_actions}</TableCell>
            <TableCell className="text-right tabular-nums">{(row.response_rate * 100).toFixed(1)}%</TableCell>
            <TableCell className="text-center">
              <Badge
                variant={row.execution_completed ? 'default' : 'secondary'}
                className={cn(
                  'text-xs',
                  row.execution_completed
                    ? 'bg-green-600 hover:bg-green-600'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                )}
              >
                {row.execution_completed ? 'Done' : 'Pending'}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground" title={row.learning_activity ?? undefined}>
              {((row.learning_minutes != null && row.learning_minutes > 0) || (row.learning_activity && row.learning_activity.trim())) ? (
                <>{row.learning_minutes != null && row.learning_minutes > 0 && <span className="font-medium text-foreground">{row.learning_minutes} min</span>}{(row.learning_minutes != null && row.learning_minutes > 0) && row.learning_activity?.trim() ? ' — ' : ''}{row.learning_activity?.trim() ?? ''}</>
              ) : (
                '—'
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
