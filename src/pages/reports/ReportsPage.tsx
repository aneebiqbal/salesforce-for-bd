import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Analytics and exports.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Reports will be available here.</p>
        </CardContent>
      </Card>
    </div>
  )
}
