import { memo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: number | string
  description?: string
}

export const StatCard = memo(({ title, value, description }: StatCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
})
StatCard.displayName = 'StatCard'
