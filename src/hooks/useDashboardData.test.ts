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
  d.setHours(12, 0, 0, 0) // noon to avoid timezone issues
  return d
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
    exerciseId: exerciseName.length, // deterministic fake id
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
      expect(result.current).toBeDefined()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.hasData).toBe(false)
      expect(result.current.thisWeekSessions).toBe(0)
      expect(result.current.streakDays).toBe(0)
      expect(result.current.progressionItems).toEqual([])
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
    })
  })

  it('counts distinct session dates this week (excluding rehab)', async () => {
    const userId = await createUser()
    const today = new Date()
    today.setHours(12, 0, 0, 0)

    // Two entries on the same day should count as 1 session
    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Bench Press', today, [{ weightKg: 60, reps: 8 }]),
      makeEntry(userId, 'Squat', today, [{ weightKg: 100, reps: 5 }]),
    ])

    // Rehab entry today should not count
    await db.notebookEntries.add(
      makeEntry(userId, 'Bird Dog', today, [{ weightKg: 0, reps: 10 }], 'rehab')
    )

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.thisWeekSessions).toBe(1)
    })
  })

  it('calculates streak days correctly', async () => {
    const userId = await createUser()

    // Entries for today, yesterday, and 2 days ago (streak of 3)
    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Bench Press', daysAgo(0), [{ weightKg: 60, reps: 8 }]),
      makeEntry(userId, 'Squat', daysAgo(1), [{ weightKg: 100, reps: 5 }]),
      makeEntry(userId, 'Bird Dog', daysAgo(2), [{ weightKg: 0, reps: 10 }], 'rehab'),
      // Gap on day 3 -- so entry on day 4 should not extend streak
      makeEntry(userId, 'Bench Press', daysAgo(4), [{ weightKg: 55, reps: 8 }]),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.streakDays).toBe(3)
    })
  })

  it('returns streak=0 if no entry today', async () => {
    const userId = await createUser()

    // Entry only yesterday, not today
    await db.notebookEntries.add(
      makeEntry(userId, 'Bench Press', daysAgo(1), [{ weightKg: 60, reps: 8 }])
    )

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.streakDays).toBe(0)
    })
  })

  it('computes progression items comparing most recent vs 4+ entries ago', async () => {
    const userId = await createUser()

    // 5 entries for Bench Press spread over 5 days
    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Bench Press', daysAgo(10), [{ weightKg: 60, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(8), [{ weightKg: 62, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(6), [{ weightKg: 65, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(4), [{ weightKg: 67, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(2), [{ weightKg: 70, reps: 8 }]),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.progressionItems.length).toBe(1)
    })

    const bench = result.current.progressionItems[0]
    expect(bench.exerciseName).toBe('Bench Press')
    // index 0 (entries.length - 5 = 0) = 60kg, last = 70kg
    expect(bench.previousWeightKg).toBe(60)
    expect(bench.currentWeightKg).toBe(70)
    expect(bench.trend).toBe('up')
  })

  it('uses first entry as previous when fewer than 5 entries', async () => {
    const userId = await createUser()

    // Only 2 entries for Squat
    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Squat', daysAgo(5), [{ weightKg: 100, reps: 5 }]),
      makeEntry(userId, 'Squat', daysAgo(1), [{ weightKg: 100, reps: 5 }]),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.progressionItems.length).toBe(1)
    })

    const squat = result.current.progressionItems[0]
    expect(squat.previousWeightKg).toBe(100)
    expect(squat.currentWeightKg).toBe(100)
    expect(squat.trend).toBe('same')
  })

  it('correctly identifies down trend', async () => {
    const userId = await createUser()

    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Leg Press', daysAgo(5), [{ weightKg: 200, reps: 10 }]),
      makeEntry(userId, 'Leg Press', daysAgo(1), [{ weightKg: 190, reps: 10 }]),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.progressionItems.length).toBe(1)
    })

    const legPress = result.current.progressionItems[0]
    expect(legPress.trend).toBe('down')
    expect(legPress.previousWeightKg).toBe(200)
    expect(legPress.currentWeightKg).toBe(190)
  })

  it('uses max weight across sets for progression', async () => {
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
      expect(result.current.progressionItems.length).toBe(1)
    })

    const bench = result.current.progressionItems[0]
    expect(bench.previousWeightKg).toBe(65) // max of [60, 65, 60]
    expect(bench.currentWeightKg).toBe(70)  // max of [65, 70, 65]
    expect(bench.trend).toBe('up')
  })

  it('excludes rehab and skipped entries from progression', async () => {
    const userId = await createUser()

    // Only rehab entries for Bird Dog
    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Bird Dog', daysAgo(5), [{ weightKg: 0, reps: 10 }], 'rehab'),
      makeEntry(userId, 'Bird Dog', daysAgo(1), [{ weightKg: 0, reps: 10 }], 'rehab'),
    ])

    // Skipped entry for Bench
    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Bench Press', daysAgo(5), [{ weightKg: 60, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(1), [], 'heavy', true),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.hasData).toBe(true)
    })

    // Bird Dog: all rehab, excluded. Bench: only 1 non-skipped entry (need 2+), excluded.
    expect(result.current.progressionItems).toEqual([])
  })

  it('does not show progression for exercises with only 1 entry', async () => {
    const userId = await createUser()

    await db.notebookEntries.add(
      makeEntry(userId, 'Bench Press', daysAgo(1), [{ weightKg: 60, reps: 8 }])
    )

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.progressionItems).toEqual([])
  })

  it('sorts progression items alphabetically', async () => {
    const userId = await createUser()

    await db.notebookEntries.bulkAdd([
      makeEntry(userId, 'Squat', daysAgo(5), [{ weightKg: 100, reps: 5 }]),
      makeEntry(userId, 'Squat', daysAgo(1), [{ weightKg: 110, reps: 5 }]),
      makeEntry(userId, 'Bench Press', daysAgo(5), [{ weightKg: 60, reps: 8 }]),
      makeEntry(userId, 'Bench Press', daysAgo(1), [{ weightKg: 65, reps: 8 }]),
      makeEntry(userId, 'Deadlift', daysAgo(5), [{ weightKg: 140, reps: 3 }]),
      makeEntry(userId, 'Deadlift', daysAgo(1), [{ weightKg: 145, reps: 3 }]),
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.progressionItems.length).toBe(3)
    })

    expect(result.current.progressionItems[0].exerciseName).toBe('Bench Press')
    expect(result.current.progressionItems[1].exerciseName).toBe('Deadlift')
    expect(result.current.progressionItems[2].exerciseName).toBe('Squat')
  })
})
