import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useDashboardData, type ExerciseHistory, type SessionVolume } from '../hooks/useDashboardData'

const trendConfig = {
  up: { color: 'text-emerald-400', arrow: '\u2191' },
  same: { color: 'text-zinc-400', arrow: '\u2014' },
  down: { color: 'text-red-400', arrow: '\u2193' },
} as const

const intensityBadge: Record<string, { letter: string; color: string }> = {
  heavy: { letter: 'F', color: 'text-blue-400' },
  volume: { letter: 'V', color: 'text-emerald-400' },
  moderate: { letter: 'M', color: 'text-amber-400' },
}

const intensityLine: Record<string, { stroke: string; label: string; letter: string }> = {
  heavy: { stroke: '#3b82f6', label: 'Force', letter: 'F' },
  volume: { stroke: '#10b981', label: 'Volume', letter: 'V' },
  moderate: { stroke: '#f59e0b', label: 'Modere', letter: 'M' },
}

function formatDate(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${day}/${month}`
}

function ExerciseRow({ exercise }: { exercise: ExerciseHistory }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{exercise.exerciseName}</p>
          <p className="text-zinc-500 text-xs">
            {formatDate(exercise.lastDate)} — {exercise.entries.length} entr{exercise.entries.length > 1 ? '\u00e9es' : '\u00e9e'}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {exercise.currentWeightKg > 0 && (
            <span className="text-white text-sm font-semibold">{exercise.currentWeightKg}kg</span>
          )}
          {exercise.trend && (
            <span className={trendConfig[exercise.trend].color}>
              {trendConfig[exercise.trend].arrow}
            </span>
          )}
          <span className="text-zinc-500 text-xs">{expanded ? '\u25B2' : '\u25BC'}</span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-1 border-t border-zinc-800 pt-3">
          {exercise.bestWeightKg > 0 && (
            <p className="text-zinc-400 text-xs mb-2">
              Record : {exercise.bestWeightKg}kg
            </p>
          )}
          {exercise.entries.map((entry, i) => {
            if (entry.skipped) {
              return (
                <div key={entry.id ?? i} className="text-zinc-600 text-xs">
                  {formatDate(entry.date)} — skip ({entry.skipZone})
                </div>
              )
            }
            return (
              <div key={entry.id ?? i} className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500 w-12 flex-shrink-0">{formatDate(entry.date)}</span>
                {entry.sessionIntensity && intensityBadge[entry.sessionIntensity] && (
                  <span className={`${intensityBadge[entry.sessionIntensity].color} font-bold w-3 flex-shrink-0`}>
                    {intensityBadge[entry.sessionIntensity].letter}
                  </span>
                )}
                <span className="text-zinc-300">
                  {entry.sets.map((s) => `${s.weightKg}kg\u00d7${s.reps}`).join(' \u00b7 ')}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TonnageChart({ sessionVolumes }: { sessionVolumes: SessionVolume[] }) {
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<{ key: string; idx: number } | null>(null)

  // Take last 12 sessions, reversed to chronological order
  const recent = sessionVolumes.slice(0, 12).reverse()
  const allTonnages = recent.map(s => s.tonnageKg)
  const maxT = Math.max(...allTonnages)
  const minT = Math.min(...allTonnages)
  const range = maxT - minT || 1

  // Chart dimensions
  const W = 300
  const H = expanded ? 180 : 100
  const PAD_X = 4
  const PAD_Y = 8

  // Group points by intensity
  const linesByIntensity: Record<string, { x: number; y: number; sv: SessionVolume }[]> = {}
  recent.forEach((sv, i) => {
    const key = sv.intensity ?? 'moderate'
    if (!linesByIntensity[key]) linesByIntensity[key] = []
    const x = PAD_X + (i / Math.max(recent.length - 1, 1)) * (W - PAD_X * 2)
    const y = PAD_Y + (1 - (sv.tonnageKg - minT) / range) * (H - PAD_Y * 2)
    linesByIntensity[key].push({ x, y, sv })
  })

  const activeKeys = Object.keys(linesByIntensity).filter(k => intensityLine[k])

  // Find selected point info
  const selectedInfo = selected && linesByIntensity[selected.key]?.[selected.idx]
  const selectedCfg = selected ? intensityLine[selected.key] : null

  return (
    <div className="bg-zinc-900 rounded-xl p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-zinc-400 text-xs uppercase tracking-wider">Tonnage par s{'\u00e9'}ance</p>
        <button
          onClick={() => { setExpanded(e => !e); setSelected(null) }}
          className="text-zinc-600 text-xs"
        >
          {expanded ? '\u25B2 Reduire' : '\u25BC Agrandir'}
        </button>
      </div>

      {/* Selected point tooltip */}
      {selectedInfo && selectedCfg && (
        <div className="flex items-center gap-2 mb-2 text-xs">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: selectedCfg.stroke }} />
          <span className="text-white font-semibold">{selectedInfo.sv.tonnageKg.toLocaleString()}kg</span>
          <span className="text-zinc-500">{selectedCfg.label} — {formatDate(selectedInfo.sv.date)}</span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H + 16}`}
        className={`w-full transition-all duration-300 ${expanded ? 'h-52' : 'h-28'}`}
        onClick={() => setSelected(null)}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => {
          if (!expanded && (pct === 0.25 || pct === 0.75)) return null
          const y = PAD_Y + (1 - pct) * (H - PAD_Y * 2)
          const val = Math.round(minT + pct * range)
          return (
            <g key={pct}>
              <line x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke="#27272a" strokeWidth="0.5" />
              <text x={W - PAD_X} y={y - 2} textAnchor="end" fill="#52525b" fontSize="7">{val >= 1000 ? `${(val / 1000).toFixed(1)}t` : `${val}kg`}</text>
            </g>
          )
        })}

        {/* Lines + dots per intensity */}
        {activeKeys.map(key => {
          const points = linesByIntensity[key]
          const cfg = intensityLine[key]
          const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
          return (
            <g key={key}>
              {points.length > 1 && (
                <polyline
                  points={polyline}
                  fill="none"
                  stroke={cfg.stroke}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {points.map((p, j) => (
                <circle
                  key={j}
                  cx={p.x}
                  cy={p.y}
                  r={selected?.key === key && selected?.idx === j ? 5 : 3}
                  fill={cfg.stroke}
                  className="cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); setSelected({ key, idx: j }) }}
                />
              ))}
            </g>
          )
        })}

        {/* X-axis dates */}
        {recent.map((sv, i) => {
          const x = PAD_X + (i / Math.max(recent.length - 1, 1)) * (W - PAD_X * 2)
          if (recent.length > 6 && i % 2 !== 0 && i !== recent.length - 1) return null
          return (
            <text key={i} x={x} y={H + 12} textAnchor="middle" fill="#52525b" fontSize="7">
              {formatDate(sv.date)}
            </text>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="flex gap-3 mt-1">
        {activeKeys.map(key => {
          const cfg = intensityLine[key]
          return (
            <div key={key} className="flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: cfg.stroke }} />
              <span className="text-zinc-500 text-[10px]">{cfg.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const userId = user?.id
  const data = useDashboardData(userId)

  return (
    <div className="flex flex-col h-[var(--content-h)] overflow-hidden">
      <div className="flex-shrink-0 px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold">Historique</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6">
        {data.isLoading ? (
          <p className="text-zinc-400">Chargement...</p>
        ) : !data.hasData ? (
          <div className="bg-zinc-900 rounded-xl p-6 text-center">
            <p className="text-zinc-400 text-base mb-2">
              Aucune donn{'\u00e9'}e pour l{"'"}instant.
            </p>
            <p className="text-zinc-400 text-sm">
              Compl{'\u00e9'}tez votre premi{'\u00e8'}re s{'\u00e9'}ance pour voir l{"'"}historique.
            </p>
          </div>
        ) : (
          <>
            {/* Volume tracker — line chart per intensity */}
            {data.sessionVolumes.length > 0 && (
              <TonnageChart sessionVolumes={data.sessionVolumes} />
            )}

            <div className="space-y-2">
              {data.exercises.map((ex) => (
                <ExerciseRow key={ex.exerciseId} exercise={ex} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
