import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface PipelineChartProps {
  data: { stage: string; count: number }[]
}

const STAGE_COLORS: Record<string, string> = {
  new: 'var(--chart-3)',
  contacted: 'var(--chart-4)',
  proposal: 'var(--chart-4)',
  interview: 'var(--chart-2)',
  negotiation: 'var(--chart-2)',
  won: 'var(--chart-2)',      // green-ish
  lost: 'var(--destructive)',
}

function getStageColor(stage: string): string {
  const key = stage.toLowerCase().replace(' ', '_')
  return STAGE_COLORS[key] ?? 'var(--chart-1)'
}

export const PipelineChart = ({ data }: PipelineChartProps) => {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
        No leads yet. Add leads in the pipeline to see the breakdown.
      </div>
    )
  }

  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, left: 72, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 10 ? String(v) : v)}
          />
          <YAxis
            type="category"
            dataKey="stage"
            tick={{ fontSize: 11, fill: 'var(--foreground)' }}
            axisLine={false}
            tickLine={false}
            width={72}
            tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              padding: '10px 14px',
            }}
            formatter={(value, _name, props) => {
              const v = Number(value ?? 0)
              const pct = total > 0 ? ((v / total) * 100).toFixed(0) : '0'
              return [`${v} lead${v !== 1 ? 's' : ''} (${pct}%)`, props.payload.stage]
            }}
            cursor={{ fill: 'var(--muted)', fillOpacity: 0.15 }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getStageColor(entry.stage)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
