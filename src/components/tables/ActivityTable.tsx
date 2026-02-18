import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import type { DailyActivity } from '@/types'

interface ActivityTableProps {
  activities: DailyActivity[]
  isLoading?: boolean
}

export const ActivityTable = ({ activities, isLoading }: ActivityTableProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }
  if (activities.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No activities yet
      </div>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Platform</TableHead>
          <TableHead>Responses</TableHead>
          <TableHead>Leads</TableHead>
          <TableHead>Notes</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activities.map((a) => (
          <TableRow key={a.id}>
            <TableCell>{formatDate(a.activity_date)}</TableCell>
            <TableCell>{a.platform?.display_name ?? a.platform_id}</TableCell>
            <TableCell>{a.responses_received ?? '-'}</TableCell>
            <TableCell>{a.leads_created ?? '-'}</TableCell>
            <TableCell className="max-w-[200px] truncate">{a.notes ?? '-'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
