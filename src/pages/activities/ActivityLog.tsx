import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ActivityLogTable } from '@/components/tables/ActivityLogTable'
import { useAuth } from '@/hooks/useAuth'
import { useActivityLog } from '@/hooks/useActivityLog'
import { useUserProfiles } from '@/hooks/useUserProfiles'
import { usePlatforms } from '@/hooks/usePlatforms'

export const ActivityLog = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const ALL_VALUE = '__all__'
  const [bdMemberId, setBdMemberId] = useState<string>(ALL_VALUE)
  const [platformId, setPlatformId] = useState<string>(ALL_VALUE)
  const [page, setPage] = useState(1)

  const { users: bdUsers } = useUserProfiles('bd_manager')
  const { platforms } = usePlatforms()
  const { rows, total, pageSize, isLoading } = useActivityLog({
    bdMemberId: isAdmin ? (bdMemberId === ALL_VALUE ? null : bdMemberId) : user?.id ?? null,
    startDate: startDate || null,
    endDate: endDate || null,
    platformId: platformId === ALL_VALUE ? null : platformId,
    page,
  })

  const totalPages = Math.ceil(total / pageSize) || 1
  const completedCount = rows.filter((r) => r.execution_completed).length

  const handleRowClick = () => {
    navigate('/activities')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Activity History</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? 'View and filter daily activity across the team. Use filters to see by person, platform, or date range.'
            : 'Your logged daily activity. Each row is one profile for one day.'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Filter by BD member, platform, and date range.' : 'Filter by platform and date range.'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1) }} />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1) }} />
            </div>
            {isAdmin && (
              <div className="space-y-2">
                <Label>BD Member</Label>
                <Select value={bdMemberId} onValueChange={(v) => { setBdMemberId(v); setPage(1) }}>
                  <SelectTrigger>
                    <SelectValue placeholder={bdMemberId === ALL_VALUE ? 'All team' : undefined} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_VALUE}>All team</SelectItem>
                    {bdUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={platformId} onValueChange={(v) => { setPlatformId(v); setPage(1) }}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {isAdmin ? (bdMemberId !== ALL_VALUE ? 'Activities' : 'Team activities') : 'My activities'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              Newest first
              {total > 0 && (
                <> · {completedCount} of {rows.length} on this page marked done</>
              )}
            </p>
          </div>
          {total > 0 && (
            <Badge variant="secondary" className="text-xs">
              {total} total
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <ActivityLogTable rows={rows} isLoading={isLoading} onRowClick={handleRowClick} />
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
