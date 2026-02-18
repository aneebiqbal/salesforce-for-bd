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
import { formatDate, formatCurrency } from '@/lib/utils'
import type { Lead } from '@/types'

interface LeadsTableProps {
  leads: Lead[]
  isLoading?: boolean
}

export const LeadsTable = ({ leads, isLoading }: LeadsTableProps) => {
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
  if (leads.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No leads yet
      </div>
    )
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Company</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Value</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell className="font-medium">{lead.client_name}</TableCell>
            <TableCell>{lead.company ?? '—'}</TableCell>
            <TableCell>{lead.source_platform?.display_name ?? lead.source_platform_id}</TableCell>
            <TableCell>
              <Badge variant="secondary" className="capitalize">
                {lead.status}
              </Badge>
            </TableCell>
            <TableCell>
              {lead.estimated_value != null ? formatCurrency(lead.estimated_value) : '-'}
            </TableCell>
            <TableCell>{formatDate(lead.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
