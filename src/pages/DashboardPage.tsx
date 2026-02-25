import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useDashboardData, type ExerciseHistory } from '../hooks/useDashboardData'

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
            {/* Volume tracker */}
            {data.sessionVolumes.length > 0 && (
              <div className="bg-zinc-900 rounded-xl p-4 mb-4">
                <p className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Tonnage par seance</p>
                <div className="flex items-end gap-1 h-20">
                  {data.sessionVolumes.slice(0, 10).reverse().map((sv, i) => {
                    const max = Math.max(...data.sessionVolumes.slice(0, 10).map(s => s.tonnageKg))
                    const pct = max > 0 ? (sv.tonnageKg / max) * 100 : 0
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-emerald-600 rounded-t"
                          style={{ height: `${Math.max(pct, 4)}%` }}
                          title={`${sv.tonnageKg}kg — ${formatDate(sv.date)}`}
                        />
                        <span className="text-zinc-600 text-[9px]">{formatDate(sv.date)}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-2 text-xs">
                  <span className="text-zinc-500">Derniere : {data.sessionVolumes[0].tonnageKg.toLocaleString()}kg</span>
                  {data.sessionVolumes.length >= 2 && (() => {
                    const diff = data.sessionVolumes[0].tonnageKg - data.sessionVolumes[1].tonnageKg
                    if (diff === 0) return null
                    return (
                      <span className={diff > 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {diff > 0 ? '+' : ''}{diff.toLocaleString()}kg
                      </span>
                    )
                  })()}
                </div>
              </div>
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
