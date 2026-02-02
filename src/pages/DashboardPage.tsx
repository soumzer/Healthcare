import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useDashboardData } from '../hooks/useDashboardData'
import AttendanceTracker from '../components/dashboard/AttendanceTracker'
import ProgressionChart from '../components/dashboard/ProgressionChart'
import PainChart from '../components/dashboard/PainChart'
import SessionHistory from '../components/dashboard/SessionHistory'
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

export default function DashboardPage() {
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const userId = user?.id
  const data = useDashboardData(userId)

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Tableau de bord</h1>

      {data.isLoading ? (
        <p className="text-zinc-400 text-sm">Chargement...</p>
      ) : !data.hasData ? (
        <EmptyDashboard />
      ) : (
        <>
          <AttendanceTracker attendance={data.attendance} />
          <ProgressionChart data={data.progressionData} exerciseNames={data.exerciseNames} />
          <PainChart data={data.painData} />
          <SessionHistory sessions={data.recentSessions} />
        </>
      )}

      {userId && <BackupSection userId={userId} />}
    </div>
  )
}
