import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export interface ProgressionItem {
  exerciseName: string
  previousWeightKg: number  // best weight from 4+ entries ago
  currentWeightKg: number   // best weight from most recent entry
  trend: 'up' | 'same' | 'down'
}

export interface DashboardData {
  thisWeekSessions: number
  streakDays: number
  progressionItems: ProgressionItem[]
  hasData: boolean
  isLoading: boolean
}

const emptyData: DashboardData = {
  thisWeekSessions: 0,
  streakDays: 0,
  progressionItems: [],
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

function toDateString(d: Date): string {
  // Use local date components to avoid UTC timezone shifts
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

    // --- thisWeekSessions ---
    // Count distinct dates from non-rehab entries within current week (Monday-Sunday)
    const now = new Date()
    const weekStart = getStartOfWeek(now)
    const thisWeekDates = new Set<string>()
    for (const entry of allEntries) {
      if (entry.sessionIntensity === 'rehab') continue
      const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date)
      if (entryDate >= weekStart) {
        thisWeekDates.add(toDateString(entryDate))
      }
    }
    const thisWeekSessions = thisWeekDates.size

    // --- streakDays ---
    // Count consecutive days backwards from today where there's at least one entry (any type)
    const allDates = new Set<string>()
    for (const entry of allEntries) {
      const entryDate = entry.date instanceof Date ? entry.date : new Date(entry.date)
      allDates.add(toDateString(entryDate))
    }
    let streakDays = 0
    const checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)
    while (allDates.has(toDateString(checkDate))) {
      streakDays++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // --- progressionItems ---
    // Get non-rehab, non-skipped entries grouped by exercise
    const nonRehabEntries = allEntries.filter(
      (e) => e.sessionIntensity !== 'rehab' && !e.skipped && e.sets.length > 0
    )

    // Group by exerciseName, sorted by date ascending
    const byExercise = new Map<string, typeof nonRehabEntries>()
    for (const entry of nonRehabEntries) {
      const name = entry.exerciseName
      if (!byExercise.has(name)) {
        byExercise.set(name, [])
      }
      byExercise.get(name)!.push(entry)
    }

    const progressionItems: ProgressionItem[] = []
    for (const [exerciseName, entries] of byExercise) {
      // Sort by date ascending
      entries.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date : new Date(a.date)
        const dateB = b.date instanceof Date ? b.date : new Date(b.date)
        return dateA.getTime() - dateB.getTime()
      })

      // Need at least 2 entries to show progression (one current, one previous from 4+ ago)
      if (entries.length < 2) continue

      // Best weight from the most recent entry
      const lastEntry = entries[entries.length - 1]
      const currentWeightKg = Math.max(...lastEntry.sets.map((s) => s.weightKg))

      // Best weight from the entry 4+ entries ago (or the first entry if fewer than 5 entries)
      const previousIndex = Math.max(0, entries.length - 5)
      const previousEntry = entries[previousIndex]
      const previousWeightKg = Math.max(...previousEntry.sets.map((s) => s.weightKg))

      let trend: 'up' | 'same' | 'down'
      if (currentWeightKg > previousWeightKg) {
        trend = 'up'
      } else if (currentWeightKg < previousWeightKg) {
        trend = 'down'
      } else {
        trend = 'same'
      }

      progressionItems.push({
        exerciseName,
        previousWeightKg,
        currentWeightKg,
        trend,
      })
    }

    // Sort progression items alphabetically
    progressionItems.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName))

    const hasData = allEntries.length > 0

    return {
      thisWeekSessions,
      streakDays,
      progressionItems,
      hasData,
      isLoading: false,
    }
  }, [userId])

  return data ?? emptyData
}
