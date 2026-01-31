import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useNextSession } from './useNextSession'
import { db } from '../db'
import type { WorkoutProgram, WorkoutSession } from '../db/types'

// Helper to create a standard program with 2 sessions (Push A, Push B)
async function createTestProgram(userId: number): Promise<number> {
  return await db.workoutPrograms.add({
    userId,
    name: 'Push Pull Legs',
    type: 'push_pull_legs',
    sessions: [
      {
        name: 'Push A',
        order: 0,
        exercises: [
          { exerciseId: 1, order: 1, sets: 3, targetReps: 8, restSeconds: 120, isRehab: false },
          { exerciseId: 2, order: 2, sets: 3, targetReps: 12, restSeconds: 90, isRehab: false },
          { exerciseId: 3, order: 3, sets: 3, targetReps: 10, restSeconds: 90, isRehab: false },
          { exerciseId: 4, order: 4, sets: 3, targetReps: 15, restSeconds: 60, isRehab: false },
        ],
      },
      {
        name: 'Push B',
        order: 1,
        exercises: [
          { exerciseId: 5, order: 1, sets: 4, targetReps: 6, restSeconds: 150, isRehab: false },
          { exerciseId: 6, order: 2, sets: 3, targetReps: 10, restSeconds: 90, isRehab: false },
          { exerciseId: 7, order: 3, sets: 3, targetReps: 12, restSeconds: 90, isRehab: false },
        ],
      },
    ],
    isActive: true,
    createdAt: new Date(),
  } as WorkoutProgram)
}

// Helper to create a completed workout session
async function createCompletedSession(
  userId: number,
  programId: number,
  sessionName: string,
  completedAt: Date
): Promise<number> {
  return await db.workoutSessions.add({
    userId,
    programId,
    sessionName,
    startedAt: new Date(completedAt.getTime() - 60 * 60 * 1000), // 1h before completion
    completedAt,
    exercises: [],
    endPainChecks: [],
    notes: '',
  } as WorkoutSession)
}

describe('useNextSession', () => {
  const userId = 1

  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('returns no_program when no active program exists', async () => {
    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('no_program')
    })
  })

  it('returns ready with session A when no sessions logged yet', async () => {
    await createTestProgram(userId)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.nextSessionName).toBe('Push A')
    expect(result.current!.nextSessionIndex).toBe(0)
    expect(result.current!.exerciseCount).toBe(4)
    expect(result.current!.estimatedMinutes).toBe(60)
  })

  it('returns session B after session A was completed', async () => {
    const programId = await createTestProgram(userId)
    const completedAt = new Date(Date.now() - 48 * 60 * 60 * 1000) // 48h ago
    await createCompletedSession(userId, programId, 'Push A', completedAt)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.nextSessionName).toBe('Push B')
    expect(result.current!.nextSessionIndex).toBe(1)
    expect(result.current!.exerciseCount).toBe(3)
  })

  it('cycles back to session A after last session', async () => {
    const programId = await createTestProgram(userId)
    // Complete Push A 3 days ago
    const completedA = new Date(Date.now() - 72 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Push A', completedA)
    // Complete Push B 2 days ago (most recent)
    const completedB = new Date(Date.now() - 48 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Push B', completedB)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.nextSessionName).toBe('Push A')
    expect(result.current!.nextSessionIndex).toBe(0)
  })

  it('recommends rest if last session was less than 24h ago', async () => {
    const programId = await createTestProgram(userId)
    // Completed 14h ago
    const completedAt = new Date(Date.now() - 14 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Push A', completedAt)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('rest_recommended')
    })

    expect(result.current!.nextSessionName).toBe('Push B')
    expect(result.current!.hoursSinceLastSession).toBeGreaterThanOrEqual(13)
    expect(result.current!.hoursSinceLastSession).toBeLessThan(15)
    expect(result.current!.minimumRestHours).toBe(24)
  })

  it('returns ready if last session was more than 24h ago', async () => {
    const programId = await createTestProgram(userId)
    // Completed 30h ago
    const completedAt = new Date(Date.now() - 30 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Push A', completedAt)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.nextSessionName).toBe('Push B')
    expect(result.current!.hoursSinceLastSession).toBeGreaterThanOrEqual(29)
  })
})
