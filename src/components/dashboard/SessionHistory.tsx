import { useState } from 'react'
import type { RecentSession } from '../../hooks/useDashboardData'

interface SessionHistoryProps {
  sessions: RecentSession[]
}

function formatDate(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  })
}

export default function SessionHistory({ sessions }: SessionHistoryProps) {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <h2 className="text-lg font-semibold text-white mb-3">Historique</h2>

      {sessions.length === 0 ? (
        <p className="text-zinc-400 text-sm">
          Aucune seance enregistree pour le moment.
        </p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <div key={session.id} className="bg-zinc-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === session.id ? null : session.id)}
                className="w-full flex items-center justify-between py-2 px-3 text-left"
              >
                <div>
                  <p className="text-white text-sm font-medium">{session.name}</p>
                  <p className="text-zinc-400 text-xs">
                    {formatDate(session.date)} &middot; {session.exerciseCount} exercice{session.exerciseCount > 1 ? 's' : ''} &middot; {session.duration} min
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-zinc-400 transition-transform ${expanded === session.id ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded === session.id && session.exercises.length > 0 && (
                <div className="px-3 pb-3 border-t border-zinc-700 pt-2 space-y-2">
                  {session.exercises.map((ex, i) => (
                    <div key={i}>
                      <p className="text-zinc-300 text-xs font-medium">{ex.name}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {ex.sets.map((set, j) => (
                          <span key={j} className="text-zinc-400 text-xs tabular-nums">
                            {set.weightKg > 0 ? `${set.weightKg}kg` : 'PDC'} &times; {set.reps}
                            {set.rir > 0 && <span className="text-zinc-600"> @{set.rir}RIR</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
