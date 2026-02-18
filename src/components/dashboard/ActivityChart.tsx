import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ActivityChartProps {
  data: { date: string; value: number }[]
}

export const ActivityChart = ({ data }: ActivityChartProps) => {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No activity data yet
      </div>
    )
  }
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" className="text-xs" />
          <YAxis className="text-xs" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary) / 0.2)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
