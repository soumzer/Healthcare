import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import type { PainData } from '../../hooks/useDashboardData'

interface PainChartProps {
  data: PainData[]
}

const ZONE_LABELS: Record<string, string> = {
  neck: 'Cou',
  shoulder_left: 'Épaule G',
  shoulder_right: 'Épaule D',
  elbow_left: 'Coude G',
  elbow_right: 'Coude D',
  wrist_left: 'Poignet G',
  wrist_right: 'Poignet D',
  upper_back: 'Haut du dos',
  lower_back: 'Bas du dos',
  hip_left: 'Hanche G',
  hip_right: 'Hanche D',
  knee_left: 'Genou G',
  knee_right: 'Genou D',
  ankle_left: 'Cheville G',
  ankle_right: 'Cheville D',
  foot_left: 'Pied G',
  foot_right: 'Pied D',
  other: 'Autre',
}

const ZONE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
]

export default function PainChart({ data }: PainChartProps) {
  if (data.length === 0) {
    return (
      <div className="bg-zinc-900 rounded-xl p-4">
        <h2 className="text-lg font-semibold text-white mb-3">Évolution douleurs</h2>
        <p className="text-zinc-500 text-sm">
          Aucune donnée de douleur enregistrée.
        </p>
      </div>
    )
  }

  // Merge all dates from all zones into a unified timeline
  const allDates = new Set<string>()
  for (const zone of data) {
    for (const entry of zone.entries) {
      allDates.add(entry.date)
    }
  }
  const sortedDates = Array.from(allDates).sort()

  // Build chart data: each row has a date + one key per zone
  const chartData = sortedDates.map((date) => {
    const row: Record<string, string | number | null> = { date }
    for (const zone of data) {
      const entry = zone.entries.find((e) => e.date === date)
      row[zone.zone] = entry ? entry.level : null
    }
    return row
  })

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <h2 className="text-lg font-semibold text-white mb-3">Évolution douleurs</h2>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
          <XAxis
            dataKey="date"
            stroke="#a1a1aa"
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            tickFormatter={(value: string) => value.slice(5)}
          />
          <YAxis
            stroke="#a1a1aa"
            tick={{ fill: '#a1a1aa', fontSize: 12 }}
            domain={[0, 10]}
            ticks={[0, 2, 4, 6, 8, 10]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#27272a',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              color: '#ffffff',
            }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={((value: number | string, name: string) => [
              value,
              ZONE_LABELS[name] ?? name,
            ]) as never}
          />
          <Legend
            formatter={(value: string) => ZONE_LABELS[value] ?? value}
            wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }}
          />
          {data.map((zone, index) => (
            <Line
              key={zone.zone}
              type="monotone"
              dataKey={zone.zone}
              stroke={ZONE_COLORS[index % ZONE_COLORS.length]}
              strokeWidth={2}
              dot={{ fill: ZONE_COLORS[index % ZONE_COLORS.length], r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
