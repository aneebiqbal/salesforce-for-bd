import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PipelineChartProps {
  data: { stage: string; count: number }[]
}

export const PipelineChart = ({ data }: PipelineChartProps) => {
  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No pipeline data yet
      </div>
    )
  }
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis type="number" className="text-xs" />
          <YAxis type="category" dataKey="stage" className="text-xs" width={70} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
