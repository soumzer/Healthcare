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
  return (
    <div className="bg-zinc-900 rounded-xl p-4">
      <h2 className="text-lg font-semibold text-white mb-3">Historique</h2>

      {sessions.length === 0 ? (
        <p className="text-zinc-500 text-sm">
          Aucune séance enregistrée pour le moment.
        </p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between py-2 px-3 bg-zinc-800 rounded-lg"
            >
              <div>
                <p className="text-white text-sm font-medium">{session.name}</p>
                <p className="text-zinc-400 text-xs">
                  {formatDate(session.date)} &middot; {session.exerciseCount} exercice{session.exerciseCount > 1 ? 's' : ''} &middot; {session.duration} min
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
