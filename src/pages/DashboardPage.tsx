import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useDashboardData } from '../hooks/useDashboardData'
import AttendanceTracker from '../components/dashboard/AttendanceTracker'
import ProgressionChart from '../components/dashboard/ProgressionChart'
import PainChart from '../components/dashboard/PainChart'
import SessionHistory from '../components/dashboard/SessionHistory'
import BackupSection from '../components/settings/BackupSection'

export default function DashboardPage() {
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const userId = user?.id
  const data = useDashboardData(userId)

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-xl font-bold">Tableau de bord</h1>
      <AttendanceTracker attendance={data.attendance} />
      <ProgressionChart data={data.progressionData} exerciseNames={data.exerciseNames} />
      <PainChart data={data.painData} />
      <SessionHistory sessions={data.recentSessions} />
      {userId && <BackupSection userId={userId} />}
    </div>
  )
}
