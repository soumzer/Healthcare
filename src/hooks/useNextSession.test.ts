import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
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
  } as WorkoutProgram) as number
}

// Helper to create a 4-session Upper/Lower program
async function createUpperLowerProgram(userId: number): Promise<number> {
  return await db.workoutPrograms.add({
    userId,
    name: 'Upper Lower 4j',
    type: 'upper_lower',
    sessions: [
      {
        name: 'Lower 1',
        order: 0,
        exercises: [
          { exerciseId: 101, order: 1, sets: 4, targetReps: 8, restSeconds: 120, isRehab: false },
          { exerciseId: 102, order: 2, sets: 3, targetReps: 10, restSeconds: 90, isRehab: false },
        ],
      },
      {
        name: 'Upper 1',
        order: 1,
        exercises: [
          { exerciseId: 201, order: 1, sets: 4, targetReps: 8, restSeconds: 120, isRehab: false },
          { exerciseId: 202, order: 2, sets: 3, targetReps: 12, restSeconds: 90, isRehab: false },
        ],
      },
      {
        name: 'Lower 2',
        order: 2,
        exercises: [
          { exerciseId: 103, order: 1, sets: 4, targetReps: 6, restSeconds: 150, isRehab: false },
          { exerciseId: 104, order: 2, sets: 3, targetReps: 12, restSeconds: 90, isRehab: false },
        ],
      },
      {
        name: 'Upper 2',
        order: 3,
        exercises: [
          { exerciseId: 203, order: 1, sets: 4, targetReps: 6, restSeconds: 150, isRehab: false },
          { exerciseId: 204, order: 2, sets: 3, targetReps: 10, restSeconds: 90, isRehab: false },
        ],
      },
    ],
    isActive: true,
    createdAt: new Date(),
  } as WorkoutProgram) as number
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
  } as WorkoutSession) as number
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
    // 4 exercises: 3×(35+120) + 3×(35+90) + 3×(35+90) + 3×(35+60) = 1500s = 25min + 5 = 30
    expect(result.current!.estimatedMinutes).toBe(30)
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

describe('useNextSession - new integration fields', () => {
  const userId = 1

  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('returns nextSession object with exercises for ready state', async () => {
    await createTestProgram(userId)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.nextSession).not.toBeNull()
    expect(result.current!.nextSession!.name).toBe('Push A')
    expect(result.current!.nextSession!.exercises).toHaveLength(4)
  })

  it('returns canStart=true when ready, false when rest recommended', async () => {
    const programId = await createTestProgram(userId)
    // Completed 14h ago
    const completedAt = new Date(Date.now() - 14 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Push A', completedAt)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('rest_recommended')
    })

    expect(result.current!.canStart).toBe(false)
    expect(result.current!.restRecommendation).not.toBeNull()
    expect(result.current!.restRecommendation).toContain('Repos recommandé')
  })

  it('returns canStart=true and no rest recommendation when enough time elapsed', async () => {
    const programId = await createTestProgram(userId)
    // Completed 30h ago
    const completedAt = new Date(Date.now() - 30 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Push A', completedAt)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.canStart).toBe(true)
    expect(result.current!.restRecommendation).toBeNull()
  })

  it('returns program object for active program', async () => {
    await createTestProgram(userId)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.program).not.toBeNull()
    expect(result.current!.program!.name).toBe('Push Pull Legs')
    expect(result.current!.program!.sessions).toHaveLength(2)
  })

  it('returns null nextSession and program when no program exists', async () => {
    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('no_program')
    })

    expect(result.current!.nextSession).toBeNull()
    expect(result.current!.canStart).toBe(false)
    expect(result.current!.program).toBeNull()
  })
})

describe('useNextSession - Upper/Lower 4-session rotation', () => {
  const userId = 1

  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('first session ever returns Lower 1 (order 0)', async () => {
    await createUpperLowerProgram(userId)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.nextSessionName).toBe('Lower 1')
    expect(result.current!.nextSessionIndex).toBe(0)
    expect(result.current!.canStart).toBe(true)
  })

  it('after Lower 1 -> next is Upper 1', async () => {
    const programId = await createUpperLowerProgram(userId)
    const completedAt = new Date(Date.now() - 48 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Lower 1', completedAt)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.nextSessionName).toBe('Upper 1')
    expect(result.current!.nextSessionIndex).toBe(1)
  })

  it('after Upper 1 -> next is Lower 2', async () => {
    const programId = await createUpperLowerProgram(userId)
    const t1 = new Date(Date.now() - 96 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Lower 1', t1)
    const t2 = new Date(Date.now() - 48 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Upper 1', t2)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.nextSessionName).toBe('Lower 2')
    expect(result.current!.nextSessionIndex).toBe(2)
  })

  it('after Lower 2 -> next is Upper 2', async () => {
    const programId = await createUpperLowerProgram(userId)
    const t1 = new Date(Date.now() - 144 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Lower 1', t1)
    const t2 = new Date(Date.now() - 96 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Upper 1', t2)
    const t3 = new Date(Date.now() - 48 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Lower 2', t3)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.nextSessionName).toBe('Upper 2')
    expect(result.current!.nextSessionIndex).toBe(3)
  })

  it('after Upper 2 -> wraps around to Lower 1', async () => {
    const programId = await createUpperLowerProgram(userId)
    const t1 = new Date(Date.now() - 192 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Lower 1', t1)
    const t2 = new Date(Date.now() - 144 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Upper 1', t2)
    const t3 = new Date(Date.now() - 96 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Lower 2', t3)
    const t4 = new Date(Date.now() - 48 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Upper 2', t4)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('ready')
    })

    expect(result.current!.nextSessionName).toBe('Lower 1')
    expect(result.current!.nextSessionIndex).toBe(0)
  })

  it('rest check still works with 4-session rotation', async () => {
    const programId = await createUpperLowerProgram(userId)
    // Completed only 10h ago
    const completedAt = new Date(Date.now() - 10 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Lower 1', completedAt)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.status).toBe('rest_recommended')
    })

    expect(result.current!.canStart).toBe(false)
    expect(result.current!.nextSessionName).toBe('Upper 1')
    expect(result.current!.restRecommendation).toContain('Repos recommandé')
    expect(result.current!.hoursSinceLastSession).toBeGreaterThanOrEqual(9)
    expect(result.current!.hoursSinceLastSession).toBeLessThan(11)
  })

  it('returns nextSession with correct exercises for the next scheduled session', async () => {
    const programId = await createUpperLowerProgram(userId)
    const completedAt = new Date(Date.now() - 48 * 60 * 60 * 1000)
    await createCompletedSession(userId, programId, 'Lower 1', completedAt)

    const { result } = renderHook(() => useNextSession(userId))

    await waitFor(() => {
      expect(result.current).toBeDefined()
      expect(result.current!.nextSession).not.toBeNull()
    })

    // Upper 1 has exercise IDs 201 and 202
    expect(result.current!.nextSession!.name).toBe('Upper 1')
    expect(result.current!.nextSession!.exercises).toHaveLength(2)
    expect(result.current!.nextSession!.exercises[0].exerciseId).toBe(201)
  })
})
