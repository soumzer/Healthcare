import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { ProgressionData } from '../../hooks/useDashboardData'

interface ProgressionChartProps {
  data: ProgressionData[]
  exerciseNames: string[]
}

export default function ProgressionChart({ data, exerciseNames }: ProgressionChartProps) {
  const [selectedExercise, setSelectedExercise] = useState<string>(exerciseNames[0] ?? '')

  // Update selection if current selection is empty but names are available
  const effectiveExercise = selectedExercise || exerciseNames[0] || ''

  const chartData = (
    data.find((d) => d.exerciseName === effectiveExercise)?.entries ?? []
  ).map((entry) => ({
    date: entry.date,
    poids: entry.weightKg,
  }))

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <h2 className="text-lg font-semibold text-white mb-3">Progression</h2>

      {exerciseNames.length > 0 ? (
        <>
          <label htmlFor="exercise-select" className="sr-only">
            Choisir un exercice
          </label>
          <select
            id="exercise-select"
            value={effectiveExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="w-full mb-3 p-2 bg-zinc-800 text-white rounded-lg border border-zinc-700 text-sm"
            aria-label="Choisir un exercice pour voir la progression"
          >
            {exerciseNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          {chartData.length > 0 ? (
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
                  unit=" kg"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#27272a',
                    border: '1px solid #3f3f46',
                    borderRadius: '8px',
                    color: '#ffffff',
                  }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Line
                  type="monotone"
                  dataKey="poids"
                  stroke="#ffffff"
                  strokeWidth={2}
                  dot={{ fill: '#ffffff', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-zinc-400 text-sm">Aucune donnée pour cet exercice.</p>
          )}
        </>
      ) : (
        <p className="text-zinc-400 text-sm">
          Aucune donnée de progression disponible. Complétez des séances pour voir votre progression.
        </p>
      )}
    </div>
  )
}
