import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { useDashboardData } from './useDashboardData'
import { db } from '../db'
import type { WorkoutSession, ExerciseProgress, PainLog, UserProfile } from '../db/types'

async function createUser(): Promise<number> {
  return await db.userProfiles.add({
    name: 'Test User',
    height: 180,
    weight: 80,
    age: 30,
    sex: 'male',
    goals: ['muscle_gain'],
    daysPerWeek: 4,
    minutesPerSession: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as UserProfile) as number
}

function daysAgo(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d
}

describe('useDashboardData', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('returns empty data when no sessions exist', async () => {
    const userId = await createUser()
    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.hasData).toBe(false)
      expect(result.current.progressionData).toEqual([])
      expect(result.current.painData).toEqual([])
      expect(result.current.recentSessions).toEqual([])
      expect(result.current.attendance.thisWeek).toBe(0)
      expect(result.current.attendance.target).toBe(4)
      expect(result.current.exerciseNames).toEqual([])
    })
  })

  it('returns hasData=true when progression data exists', async () => {
    const userId = await createUser()

    await db.exerciseProgress.add({
      userId,
      exerciseId: 1,
      exerciseName: 'Bench Press',
      date: new Date(),
      sessionId: 1,
      weightKg: 60,
      reps: 24,
      sets: 3,
      avgRepsInReserve: 2,
      avgRestSeconds: 120,
      exerciseOrder: 1,
      phase: 'hypertrophy',
      weekNumber: 1,
    } as ExerciseProgress)

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.hasData).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })
  })

  it('returns isLoading=true initially then resolves', async () => {
    const { result } = renderHook(() => useDashboardData(undefined))

    // When userId is undefined, should immediately return not loading with no data
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.hasData).toBe(false)
    })
  })

  it('aggregates progression data per exercise', async () => {
    const userId = await createUser()

    const date1 = daysAgo(7)
    const date2 = daysAgo(3)

    await db.exerciseProgress.bulkAdd([
      {
        userId,
        exerciseId: 1,
        exerciseName: 'Bench Press',
        date: date1,
        sessionId: 1,
        weightKg: 60,
        reps: 24,
        sets: 3,
        avgRepsInReserve: 2,
        avgRestSeconds: 120,
        exerciseOrder: 1,
        phase: 'hypertrophy',
        weekNumber: 1,
      } as ExerciseProgress,
      {
        userId,
        exerciseId: 1,
        exerciseName: 'Bench Press',
        date: date2,
        sessionId: 2,
        weightKg: 65,
        reps: 24,
        sets: 3,
        avgRepsInReserve: 1,
        avgRestSeconds: 120,
        exerciseOrder: 1,
        phase: 'hypertrophy',
        weekNumber: 2,
      } as ExerciseProgress,
      {
        userId,
        exerciseId: 2,
        exerciseName: 'Squat',
        date: date1,
        sessionId: 1,
        weightKg: 80,
        reps: 20,
        sets: 4,
        avgRepsInReserve: 2,
        avgRestSeconds: 150,
        exerciseOrder: 2,
        phase: 'hypertrophy',
        weekNumber: 1,
      } as ExerciseProgress,
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.progressionData.length).toBe(2)
    })

    const benchData = result.current.progressionData.find(
      (p) => p.exerciseName === 'Bench Press'
    )
    expect(benchData).toBeDefined()
    expect(benchData!.entries).toHaveLength(2)
    expect(benchData!.entries[0].weightKg).toBe(60)
    expect(benchData!.entries[1].weightKg).toBe(65)

    const squatData = result.current.progressionData.find(
      (p) => p.exerciseName === 'Squat'
    )
    expect(squatData).toBeDefined()
    expect(squatData!.entries).toHaveLength(1)
    expect(squatData!.entries[0].weightKg).toBe(80)

    expect(result.current.exerciseNames).toEqual(['Bench Press', 'Squat'])
    expect(result.current.hasData).toBe(true)
  })

  it('aggregates pain data per zone', async () => {
    const userId = await createUser()

    await db.painLogs.bulkAdd([
      {
        userId,
        zone: 'knee_left',
        level: 5,
        context: 'end_session',
        date: daysAgo(7),
      } as PainLog,
      {
        userId,
        zone: 'knee_left',
        level: 3,
        context: 'end_session',
        date: daysAgo(3),
      } as PainLog,
      {
        userId,
        zone: 'lower_back',
        level: 4,
        context: 'during_set',
        exerciseName: 'Squat',
        date: daysAgo(5),
      } as PainLog,
    ])

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.painData.length).toBe(2)
    })

    const kneeData = result.current.painData.find((p) => p.zone === 'knee_left')
    expect(kneeData).toBeDefined()
    expect(kneeData!.entries).toHaveLength(2)
    // Should be sorted chronologically
    expect(kneeData!.entries[0].level).toBe(5)
    expect(kneeData!.entries[1].level).toBe(3)

    const backData = result.current.painData.find((p) => p.zone === 'lower_back')
    expect(backData).toBeDefined()
    expect(backData!.entries).toHaveLength(1)
  })

  it('calculates attendance for current week', async () => {
    const userId = await createUser()

    // Create sessions this week (today and yesterday)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    // Make sure both are within the current week
    const sessionsThisWeek = [today, yesterday].filter((d) => {
      const dayOfWeek = d.getDay()
      // Only count if it's still the same week (Mon-Sun)
      return dayOfWeek >= 0
    })

    for (const date of sessionsThisWeek) {
      const startedAt = new Date(date)
      startedAt.setHours(10, 0, 0, 0)
      const completedAt = new Date(date)
      completedAt.setHours(11, 0, 0, 0)

      await db.workoutSessions.add({
        userId,
        programId: 1,
        sessionName: 'Push A',
        startedAt,
        completedAt,
        exercises: [],
        endPainChecks: [],
        notes: '',
      } as WorkoutSession)
    }

    // Add a session from last week (should not count)
    const lastWeek = new Date()
    lastWeek.setDate(lastWeek.getDate() - 10)
    const lwStart = new Date(lastWeek)
    lwStart.setHours(10, 0, 0, 0)
    const lwEnd = new Date(lastWeek)
    lwEnd.setHours(11, 0, 0, 0)
    await db.workoutSessions.add({
      userId,
      programId: 1,
      sessionName: 'Push A',
      startedAt: lwStart,
      completedAt: lwEnd,
      exercises: [],
      endPainChecks: [],
      notes: '',
    } as WorkoutSession)

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.attendance.thisWeek).toBe(sessionsThisWeek.length)
    })

    expect(result.current.attendance.target).toBe(4)
  })

  it('returns recent sessions sorted by date', async () => {
    const userId = await createUser()

    // Add sessions in non-chronological order
    await db.workoutSessions.add({
      userId,
      programId: 1,
      sessionName: 'Push A',
      startedAt: daysAgo(5),
      completedAt: new Date(daysAgo(5).getTime() + 60 * 60 * 1000),
      exercises: [
        { exerciseId: 1, exerciseName: 'Bench', order: 1, prescribedSets: 3, prescribedReps: 8, prescribedWeightKg: 60, sets: [], status: 'completed' },
        { exerciseId: 2, exerciseName: 'OHP', order: 2, prescribedSets: 3, prescribedReps: 10, prescribedWeightKg: 40, sets: [], status: 'completed' },
      ],
      endPainChecks: [],
      notes: '',
    } as WorkoutSession)

    await db.workoutSessions.add({
      userId,
      programId: 1,
      sessionName: 'Pull A',
      startedAt: daysAgo(1),
      completedAt: new Date(daysAgo(1).getTime() + 45 * 60 * 1000),
      exercises: [
        { exerciseId: 3, exerciseName: 'Rows', order: 1, prescribedSets: 4, prescribedReps: 8, prescribedWeightKg: 70, sets: [], status: 'completed' },
      ],
      endPainChecks: [],
      notes: '',
    } as WorkoutSession)

    await db.workoutSessions.add({
      userId,
      programId: 1,
      sessionName: 'Legs',
      startedAt: daysAgo(3),
      completedAt: new Date(daysAgo(3).getTime() + 90 * 60 * 1000),
      exercises: [
        { exerciseId: 4, exerciseName: 'Squat', order: 1, prescribedSets: 4, prescribedReps: 6, prescribedWeightKg: 100, sets: [], status: 'completed' },
        { exerciseId: 5, exerciseName: 'Leg Press', order: 2, prescribedSets: 3, prescribedReps: 12, prescribedWeightKg: 120, sets: [], status: 'completed' },
        { exerciseId: 6, exerciseName: 'Leg Curl', order: 3, prescribedSets: 3, prescribedReps: 12, prescribedWeightKg: 40, sets: [], status: 'completed' },
      ],
      endPainChecks: [],
      notes: '',
    } as WorkoutSession)

    const { result } = renderHook(() => useDashboardData(userId))

    await waitFor(() => {
      expect(result.current.recentSessions.length).toBe(3)
    })

    // Most recent first
    expect(result.current.recentSessions[0].name).toBe('Pull A')
    expect(result.current.recentSessions[0].exerciseCount).toBe(1)
    expect(result.current.recentSessions[0].duration).toBe(45)

    expect(result.current.recentSessions[1].name).toBe('Legs')
    expect(result.current.recentSessions[1].exerciseCount).toBe(3)
    expect(result.current.recentSessions[1].duration).toBe(90)

    expect(result.current.recentSessions[2].name).toBe('Push A')
    expect(result.current.recentSessions[2].exerciseCount).toBe(2)
    expect(result.current.recentSessions[2].duration).toBe(60)
  })
})
