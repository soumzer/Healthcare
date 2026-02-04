import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useDashboardData } from './useDashboardData'
import { db } from '../db'
import type { UserProfile, NotebookEntry } from '../db/types'

async function createUser(): Promise<number> {
  return await db.userProfiles.add({
    name: 'Test User',
    height: 180,
    weight: 80,
    age: 30,
    sex: 'male',
    daysPerWeek: 4,
    minutesPerSession: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserProfile) as number
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(12, 0, 0, 0)
  return d
}

// Stable unique IDs per exercise name
const exerciseIds: Record<string, number> = {
  'Bench Press': 101,
  'Squat': 102,
  'Deadlift': 103,
  'Leg Press': 104,
  'Bird Dog': 105,
}

function makeEntry(
  userId: number,
  exerciseName: string,
  date: Date,
  sets: { weightKg: number; reps: number }[],
  intensity: 'heavy' | 'volume' | 'moderate' | 'rehab' = 'heavy',
  skipped = false,
): Omit<NotebookEntry, 'id'> {
  return {
    userId,
    exerciseId: exerciseIds[exerciseName] ?? exerciseName.length,
    exerciseName,
    date,
    sessionIntensity: intensity,
    sets,
    skipped,
  }
}

describe('useDashboardData', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('returns empty data when no entries exist', async () => {
    const userId = await createUser()
    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.hasData).toBe(false)
      expect(result.current.exercises).toEqual([])
    })
  })

  it('returns isLoading=false with no data when userId is undefined', async () => {
    const { result } = renderHook(() => useDashboardData(undefined))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.hasData).toBe(false)
    })
  })

  it('returns hasData=true when entries exist', async () => {
    const userId = await createUser()

    await db.notebookEntries.add(
      makeEntry(userId, 'Bench Press', new Date(), [{ weightKg: 60, reps: 8 }])
    )

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.hasData).toBe(true)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.exercises.length).toBe(1)
    })
  })

  it('groups entries by exerciseId and sorts by most recent', async () => {
    const userId = await createUser()

    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Bench Press', daysAgo(5), [{ weightKg: 60, reps: 8 }]),
      makeEntry(userId, 'Squat', daysAgo(1), [{ weightKg: 100, reps: 5 }]),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.exercises.length).toBe(2)
    })

    // Squat is more recent → first
    expect(result.current.exercises[0].exerciseName).toBe('Squat')
    expect(result.current.exercises[1].exerciseName).toBe('Bench Press')
  })

  it('computes trend comparing most recent vs 4+ entries ago', async () => {
    const userId = await createUser()

    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Bench Press', daysAgo(10), [{ weightKg: 60, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(8), [{ weightKg: 62, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(6), [{ weightKg: 65, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(4), [{ weightKg: 67, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(2), [{ weightKg: 70, reps: 8 }]),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.exercises.length).toBe(1)
    })

    const bench = result.current.exercises[0]
    expect(bench.currentWeightKg).toBe(70)
    expect(bench.trend).toBe('up')
  })

  it('trend is null when only 1 non-skipped entry', async () => {
    const userId = await createUser()

    await db.notebookEntries.add(
      makeEntry(userId, 'Bench Press', daysAgo(1), [{ weightKg: 60, reps: 8 }])
    )

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.exercises.length).toBe(1)
    })

    expect(result.current.exercises[0].trend).toBeNull()
  })

  it('correctly identifies down trend', async () => {
    const userId = await createUser()

    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Leg Press', daysAgo(5), [{ weightKg: 200, reps: 10 }]),
      makeEntry(userId, 'Leg Press', daysAgo(1), [{ weightKg: 190, reps: 10 }]),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.exercises.length).toBe(1)
    })

    const legPress = result.current.exercises[0]
    expect(legPress.trend).toBe('down')
    expect(legPress.currentWeightKg).toBe(190)
  })

  it('uses max weight across sets', async () => {
    const userId = await createUser()

    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Bench Press', daysAgo(5), [
        { weightKg: 60, reps: 8 },
        { weightKg: 65, reps: 6 },
        { weightKg: 60, reps: 8 },
      ]),
      makeEntry(userId, 'Bench Press', daysAgo(1), [
        { weightKg: 65, reps: 8 },
        { weightKg: 70, reps: 6 },
        { weightKg: 65, reps: 8 },
      ]),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.exercises.length).toBe(1)
    })

    const bench = result.current.exercises[0]
    expect(bench.currentWeightKg).toBe(70)
    expect(bench.bestWeightKg).toBe(70)
    expect(bench.trend).toBe('up')
  })

  it('tracks bestWeightKg across all entries', async () => {
    const userId = await createUser()

    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Bench Press', daysAgo(10), [{ weightKg: 80, reps: 5 }]),
      makeEntry(userId, 'Bench Press', daysAgo(5), [{ weightKg: 75, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(1), [{ weightKg: 70, reps: 10 }]),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.exercises.length).toBe(1)
    })

    // Best ever is 80kg even though current is 70kg
    expect(result.current.exercises[0].bestWeightKg).toBe(80)
    expect(result.current.exercises[0].currentWeightKg).toBe(70)
  })

  it('includes skipped entries in history but excludes from weight calculations', async () => {
    const userId = await createUser()

    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Bench Press', daysAgo(5), [{ weightKg: 60, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(1), [], 'heavy', true),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.exercises.length).toBe(1)
    })

    const bench = result.current.exercises[0]
    // 2 entries in history (including skipped)
    expect(bench.entries.length).toBe(2)
    // Weight from only the non-skipped entry
    expect(bench.currentWeightKg).toBe(60)
    // Only 1 non-skipped entry → no trend
    expect(bench.trend).toBeNull()
  })

  it('entries are sorted by date descending within each exercise', async () => {
    const userId = await createUser()

    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Squat', daysAgo(10), [{ weightKg: 90, reps: 5 }]),
      makeEntry(userId, 'Squat', daysAgo(5), [{ weightKg: 95, reps: 5 }]),
      makeEntry(userId, 'Squat', daysAgo(1), [{ weightKg: 100, reps: 5 }]),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.exercises.length).toBe(1)
    })

    const entries = result.current.exercises[0].entries
    expect(entries.length).toBe(3)
    // Most recent first
    expect(entries[0].sets[0].weightKg).toBe(100)
    expect(entries[2].sets[0].weightKg).toBe(90)
  })
})
