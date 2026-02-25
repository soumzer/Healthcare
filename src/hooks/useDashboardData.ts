import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { NotebookEntry } from '../db/types'

export interface ExerciseHistory {
  exerciseId: number
  exerciseName: string
  /** All entries sorted by date descending */
  entries: NotebookEntry[]
  /** Best weight across all entries */
  bestWeightKg: number
  /** Most recent non-skipped entry's best weight */
  currentWeightKg: number
  /** Date of most recent entry */
  lastDate: Date
  /** Trend compared to 4+ entries ago */
  trend: 'up' | 'same' | 'down' | null
}

export interface SessionVolume {
  date: Date
  tonnageKg: number
  exerciseCount: number
  intensity: 'heavy' | 'volume' | 'moderate' | null
}

export interface DashboardData {
  exercises: ExerciseHistory[]
  /** Tonnage per session day, sorted most recent first */
  sessionVolumes: SessionVolume[]
  hasData: boolean
  isLoading: boolean
}

const emptyData: DashboardData = {
  exercises: [],
  sessionVolumes: [],
  hasData: false,
  isLoading: true,
}

export function useDashboardData(userId: number | undefined): DashboardData {
  const data = useLiveQuery(async (): Promise<DashboardData> => {
    if (!userId) return { ...emptyData, isLoading: false }

    const allEntries = await db.notebookEntries
      .where('userId')
      .equals(userId)
      .toArray()

    if (allEntries.length === 0) {
      return { ...emptyData, isLoading: false }
    }

    // Group by exerciseId
    const byExercise = new Map<number, NotebookEntry[]>()
    for (const entry of allEntries) {
      if (!byExercise.has(entry.exerciseId)) {
        byExercise.set(entry.exerciseId, [])
      }
      byExercise.get(entry.exerciseId)!.push(entry)
    }

    const exercises: ExerciseHistory[] = []
    for (const [exerciseId, entries] of byExercise) {
      // Sort by date descending
      entries.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date)
        const dateB = b.date instanceof Date ? b.date : new Date(b.date)
        return dateB.getTime() - dateA.getTime()
      })

      const exerciseName = entries[0].exerciseName

      // Non-skipped entries with sets for weight calculations
      const withSets = entries.filter((e) => !e.skipped && e.sets.length > 0)

      const bestWeightKg = withSets.length > 0
        ? Math.max(...withSets.flatMap((e) => e.sets.map((s) => s.weightKg)))
        : 0

      const currentWeightKg = withSets.length > 0
        ? Math.max(...withSets[0].sets.map((s) => s.weightKg))
        : 0

      const lastDate = entries[0].date instanceof Date
        ? entries[0].date
        : new Date(entries[0].date)

      // Trend: compare most recent to 4+ entries ago
      let trend: 'up' | 'same' | 'down' | null = null
      if (withSets.length >= 2) {
        const previousIndex = Math.min(4, withSets.length - 1)
        const previousWeightKg = Math.max(
          ...withSets[previousIndex].sets.map((s) => s.weightKg),
        )
        if (currentWeightKg > previousWeightKg) trend = 'up'
        else if (currentWeightKg < previousWeightKg) trend = 'down'
        else trend = 'same'
      }

      exercises.push({
        exerciseId,
        exerciseName,
        entries,
        bestWeightKg,
        currentWeightKg,
        lastDate,
        trend,
      })
    }

    // Sort by most recently performed first
    exercises.sort((a, b) => b.lastDate.getTime() - a.lastDate.getTime())

    // Compute tonnage per session day
    const byDay = new Map<string, { date: Date; tonnage: number; exerciseIds: Set<number>; intensities: Map<string, number> }>()
    for (const entry of allEntries) {
      if (entry.skipped || entry.sets.length === 0) continue
      const d = entry.date instanceof Date ? entry.date : new Date(entry.date)
      const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!byDay.has(dayKey)) {
        byDay.set(dayKey, { date: d, tonnage: 0, exerciseIds: new Set(), intensities: new Map() })
      }
      const day = byDay.get(dayKey)!
      for (const s of entry.sets) {
        day.tonnage += s.weightKg * s.reps
      }
      day.exerciseIds.add(entry.exerciseId)
      if (entry.sessionIntensity && entry.sessionIntensity !== 'rehab') {
        day.intensities.set(entry.sessionIntensity, (day.intensities.get(entry.sessionIntensity) ?? 0) + 1)
      }
    }
    const sessionVolumes: SessionVolume[] = [...byDay.values()]
      .map(d => {
        // Dominant intensity = most frequent
        let intensity: 'heavy' | 'volume' | 'moderate' | null = null
        let maxCount = 0
        for (const [k, v] of d.intensities) {
          if (v > maxCount) { maxCount = v; intensity = k as 'heavy' | 'volume' | 'moderate' }
        }
        return { date: d.date, tonnageKg: Math.round(d.tonnage), exerciseCount: d.exerciseIds.size, intensity }
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime())

    return {
      exercises,
      sessionVolumes,
      hasData: true,
      isLoading: false,
    }
  }, [userId])

  return data ?? emptyData
}
