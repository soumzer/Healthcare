import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useDashboardData } from '../hooks/useDashboardData'
import BackupSection from '../components/settings/BackupSection'

function EmptyDashboard() {
  return (
    <div className="bg-zinc-900 rounded-xl p-6 text-center">
      <p className="text-zinc-400 text-base mb-2">
        Aucune donn{'\u00e9'}e pour l{"'"}instant.
      </p>
      <p className="text-zinc-400 text-sm">
        Compl{'\u00e9'}tez votre premi{'\u00e8'}re s{'\u00e9'}ance pour voir vos statistiques.
      </p>
    </div>
  )
}

const trendConfig = {
  up: { color: 'text-emerald-400', arrow: '\u2191' },
  same: { color: 'text-zinc-400', arrow: '\u2014' },
  down: { color: 'text-red-400', arrow: '\u2193' },
} as const

export default function DashboardPage() {
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const userId = user?.id
  const data = useDashboardData(userId)

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Stats</h1>

      {data.isLoading ? (
        <p className="text-zinc-400">Chargement...</p>
      ) : !data.hasData ? (
        <EmptyDashboard />
      ) : (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 rounded-xl p-4">
              <p className="text-zinc-400 text-xs uppercase">Cette semaine</p>
              <p className="text-2xl font-bold">{data.thisWeekSessions}</p>
              <p className="text-zinc-500 text-xs">s{'\u00e9'}ances</p>
            </div>
            <div className="bg-zinc-900 rounded-xl p-4">
              <p className="text-zinc-400 text-xs uppercase">S{'\u00e9'}rie</p>
              <p className="text-2xl font-bold">{data.streakDays}</p>
              <p className="text-zinc-500 text-xs">jours</p>
            </div>
          </div>

          {/* Progression */}
          {data.progressionItems.length > 0 && (
            <div className="bg-zinc-900 rounded-xl p-4">
              <p className="text-zinc-400 text-xs uppercase tracking-wider mb-3">Progression</p>
              {data.progressionItems.map((item) => (
                <div
                  key={item.exerciseName}
                  className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0"
                >
                  <span className="text-sm text-white truncate flex-1">{item.exerciseName}</span>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-400">{item.previousWeightKg}kg</span>
                    <span className="text-zinc-500">{'\u2192'}</span>
                    <span className="text-white">{item.currentWeightKg}kg</span>
                    <span className={trendConfig[item.trend].color}>
                      {trendConfig[item.trend].arrow}
                    </span>
                  </div>
                </div>
              ))}
              <p className="text-zinc-500 text-xs mt-3">
                Bas{'\u00e9'} sur tes 4 derni{'\u00e8'}res s{'\u00e9'}ances
              </p>
            </div>
          )}
        </>
      )}

      {userId && <BackupSection userId={userId} />}
    </div>
  )
}
