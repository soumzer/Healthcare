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

export interface DashboardData {
  exercises: ExerciseHistory[]
  hasData: boolean
  isLoading: boolean
}

const emptyData: DashboardData = {
  exercises: [],
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

    return {
      exercises,
      hasData: true,
      isLoading: false,
    }
  }, [userId])

  return data ?? emptyData
}
