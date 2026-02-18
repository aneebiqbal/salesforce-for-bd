import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import type { ActivityLogRow } from '@/hooks/useActivityLog'

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
          <TableHead className="text-right">Total Actions</TableHead>
          <TableHead className="text-right">Response Rate</TableHead>
          <TableHead>Execution</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            className={onRowClick ? 'cursor-pointer' : ''}
            onClick={() => onRowClick?.(row)}
          >
            <TableCell>{row.activity_date}</TableCell>
            <TableCell>{row.bd_member_name}</TableCell>
            <TableCell>{row.profile_name}</TableCell>
            <TableCell>{row.platform_display_name}</TableCell>
            <TableCell className="text-right">{row.total_actions}</TableCell>
            <TableCell className="text-right">{(row.response_rate * 100).toFixed(1)}%</TableCell>
            <TableCell>{row.execution_completed ? 'Yes' : 'No'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
