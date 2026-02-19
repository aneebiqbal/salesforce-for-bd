import { memo } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  description?: string
  icon?: LucideIcon
  className?: string
}

export const StatCard = memo(({ title, value, description, icon: Icon, className }: StatCardProps) => {
  return (
    <Card className={cn('overflow-hidden transition-shadow hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="size-4 text-primary" aria-hidden />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  )
})
StatCard.displayName = 'StatCard'
