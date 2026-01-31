import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export interface ProgressionEntry {
  date: string
  weightKg: number
  reps: number
}

export interface ProgressionData {
  exerciseName: string
  entries: ProgressionEntry[]
}

export interface PainEntry {
  date: string
  level: number
}

export interface PainData {
  zone: string
  entries: PainEntry[]
}

export interface RecentSession {
  id: number
  name: string
  date: Date
  exerciseCount: number
  duration: number // minutes
}

export interface AttendanceData {
  thisWeek: number
  target: number
}

export interface DashboardData {
  progressionData: ProgressionData[]
  painData: PainData[]
  recentSessions: RecentSession[]
  attendance: AttendanceData
  exerciseNames: string[]
  hasData: boolean
  isLoading: boolean
}

const emptyData: DashboardData = {
  progressionData: [],
  painData: [],
  recentSessions: [],
  attendance: { thisWeek: 0, target: 4 },
  exerciseNames: [],
  hasData: false,
  isLoading: true,
}

function getStartOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // Monday as start of week (day=0 is Sunday, so shift)
  const diff = day === 0 ? 6 : day - 1
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - diff)
  return d
}

export function useDashboardData(userId: number | undefined): DashboardData {
  const data = useLiveQuery(async (): Promise<DashboardData> => {
    if (!userId) return { ...emptyData, isLoading: false }

    // Fetch user profile for target
    const profile = await db.userProfiles.get(userId)
    const target = profile?.daysPerWeek ?? 4

    // Fetch exercise progress for progression charts
    const progressEntries = await db.exerciseProgress
      .where('userId')
      .equals(userId)
      .toArray()

    // Group by exercise name
    const progressByExercise = new Map<string, ProgressionEntry[]>()
    for (const entry of progressEntries) {
      const name = entry.exerciseName
      if (!progressByExercise.has(name)) {
        progressByExercise.set(name, [])
      }
      progressByExercise.get(name)!.push({
        date: entry.date instanceof Date
          ? entry.date.toISOString().slice(0, 10)
          : new Date(entry.date).toISOString().slice(0, 10),
        weightKg: entry.weightKg,
        reps: entry.reps,
      })
    }

    // Sort entries by date within each exercise
    const progressionData: ProgressionData[] = []
    const exerciseNames: string[] = []
    for (const [exerciseName, entries] of progressByExercise) {
      entries.sort((a, b) => a.date.localeCompare(b.date))
      progressionData.push({ exerciseName, entries })
      exerciseNames.push(exerciseName)
    }
    exerciseNames.sort()

    // Fetch pain logs for pain chart
    const painEntries = await db.painLogs
      .where('userId')
      .equals(userId)
      .toArray()

    const painByZone = new Map<string, PainEntry[]>()
    for (const entry of painEntries) {
      const zone = entry.zone
      if (!painByZone.has(zone)) {
        painByZone.set(zone, [])
      }
      painByZone.get(zone)!.push({
        date: entry.date instanceof Date
          ? entry.date.toISOString().slice(0, 10)
          : new Date(entry.date).toISOString().slice(0, 10),
        level: entry.level,
      })
    }

    const painData: PainData[] = []
    for (const [zone, entries] of painByZone) {
      entries.sort((a, b) => a.date.localeCompare(b.date))
      painData.push({ zone, entries })
    }

    // Fetch recent sessions
    const sessions = await db.workoutSessions
      .where('userId')
      .equals(userId)
      .toArray()

    // Sort by startedAt descending, take last 20
    const sortedSessions = sessions
      .filter((s) => s.completedAt)
      .sort((a, b) => {
        const dateA = a.startedAt instanceof Date ? a.startedAt : new Date(a.startedAt)
        const dateB = b.startedAt instanceof Date ? b.startedAt : new Date(b.startedAt)
        return dateB.getTime() - dateA.getTime()
      })
      .slice(0, 20)

    const recentSessions: RecentSession[] = sortedSessions.map((s) => {
      const startedAt = s.startedAt instanceof Date ? s.startedAt : new Date(s.startedAt)
      const completedAt = s.completedAt instanceof Date ? s.completedAt : new Date(s.completedAt!)
      const durationMs = completedAt.getTime() - startedAt.getTime()
      return {
        id: s.id!,
        name: s.sessionName,
        date: startedAt,
        exerciseCount: s.exercises.length,
        duration: Math.round(durationMs / (1000 * 60)),
      }
    })

    // Attendance: count sessions this week (Monday-Sunday)
    const now = new Date()
    const weekStart = getStartOfWeek(now)
    const thisWeek = sessions.filter((s) => {
      if (!s.completedAt) return false
      const completedAt = s.completedAt instanceof Date ? s.completedAt : new Date(s.completedAt)
      return completedAt >= weekStart
    }).length

    const hasData =
      progressionData.length > 0 ||
      painData.length > 0 ||
      recentSessions.length > 0

    return {
      progressionData,
      painData,
      recentSessions,
      attendance: { thisWeek, target },
      exerciseNames,
      hasData,
      isLoading: false,
    }
  }, [userId])

  return data ?? emptyData
}
