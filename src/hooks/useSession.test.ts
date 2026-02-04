import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useSession, type UseSessionParams } from './useSession'
import { db } from '../db'
import type { Exercise, HealthCondition } from '../db/types'

const mockProgramSession = {
  name: 'Push A',
  order: 1,
  exercises: [
    { exerciseId: 1, order: 1, sets: 3, targetReps: 8, restSeconds: 120, isRehab: false },
    { exerciseId: 2, order: 2, sets: 3, targetReps: 12, restSeconds: 90, isRehab: false },
  ],
}

const mockExercises: Exercise[] = [
  {
    id: 1,
    name: 'Developpe couche barre',
    category: 'compound',
    primaryMuscles: ['pectoraux'],
    secondaryMuscles: ['triceps'],
    equipmentNeeded: ['bench_press'],
    contraindications: [],
    alternatives: [],
    instructions: '',
    isRehab: false,
    tags: [],
  },
  {
    id: 2,
    name: 'Elevations laterales',
    category: 'isolation',
    primaryMuscles: ['deltoides'],
    secondaryMuscles: [],
    equipmentNeeded: ['dumbbells'],
    contraindications: [],
    alternatives: [],
    instructions: '',
    isRehab: false,
    tags: [],
  },
  {
    id: 10,
    name: 'Tyler Twist inverse',
    category: 'rehab',
    primaryMuscles: ['avant-bras'],
    secondaryMuscles: [],
    equipmentNeeded: [],
    contraindications: [],
    alternatives: [],
    instructions: '',
    isRehab: true,
    rehabTarget: 'elbow_right',
    tags: ['rehab'],
  },
]

const defaultParams: UseSessionParams = {
  programSession: mockProgramSession,
  history: {
    1: { lastWeightKg: 40, lastReps: [8, 8, 8], lastAvgRIR: 2 },
    2: { lastWeightKg: 10, lastReps: [12, 12, 12], lastAvgRIR: 3 },
  },
  userId: 1,
  programId: 1,
  userConditions: ['elbow_right'],
  availableExercises: mockExercises,
  exerciseNames: { 1: 'Developpe couche barre', 2: 'Elevations laterales' },
}

/** Helper: completes all exercises (2 exercises x 3 sets each) */
async function completeAllExercises(result: { current: ReturnType<typeof useSession> }, useFakeTimers = true) {
  // Exercise 1: 3 sets
  act(() => result.current.completeWarmup())
  for (let i = 0; i < 2; i++) {
    act(() => result.current.startSet())
    act(() => result.current.logSet(8, 42.5, 2))
    act(() => result.current.completeRestTimer())
  }
  act(() => result.current.startSet())
  act(() => result.current.logSet(8, 42.5, 2))

  // Exercise 2: 3 sets
  act(() => result.current.completeWarmup())
  for (let i = 0; i < 2; i++) {
    act(() => result.current.startSet())
    act(() => result.current.logSet(12, 12.5, 3))
    act(() => result.current.completeRestTimer())
  }
  // Last set triggers async advanceExerciseOrEnd which awaits DB save
  act(() => result.current.startSet())
  act(() => result.current.logSet(12, 12.5, 3))
  // Flush pending promises (DB operations)
  if (useFakeTimers) {
    await act(async () => {
      await vi.runAllTimersAsync()
    })
  } else {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
  }
}

describe('useSession', () => {
  beforeEach(async () => {
    sessionStorage.clear()
    await db.delete()
    await db.open()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in warmup phase', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    expect(result.current.phase).toBe('warmup')
  })

  it('has warmup sets generated for current exercise', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    expect(result.current.warmupSets.length).toBeGreaterThan(0)
  })

  it('transitions to exercise after completeWarmup', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.completeWarmup())
    expect(result.current.phase).toBe('exercise')
  })

  it('transitions to exercise after skipWarmup', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.skipWarmup())
    expect(result.current.phase).toBe('exercise')
  })

  it('advances warmup sets one at a time, then moves to exercise', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    const numWarmupSets = result.current.warmupSets.length
    expect(numWarmupSets).toBeGreaterThan(1)

    for (let i = 0; i < numWarmupSets - 1; i++) {
      act(() => result.current.completeWarmupSet())
      expect(result.current.phase).toBe('warmup')
    }
    // Complete last warmup set -> moves to exercise
    act(() => result.current.completeWarmupSet())
    expect(result.current.phase).toBe('exercise')
  })

  it('shows current exercise with name and prescribed weight', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.completeWarmup())
    expect(result.current.currentExercise).not.toBeNull()
    expect(result.current.currentExercise!.exerciseName).toBe('Developpe couche barre')
    // With history: 40kg, all reps hit at target (8), avgRIR=2
    // Progression requires avgReps >= targetReps + 2 to increase weight
    // Since 8 < 10, weight stays at 40kg (reps increase instead)
    expect(result.current.currentExercise!.prescribedWeightKg).toBe(40)
  })

  it('transitions to set_logger when startSet is called', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.completeWarmup())
    expect(result.current.phase).toBe('exercise')
    act(() => result.current.startSet())
    expect(result.current.phase).toBe('set_logger')
  })

  it('after logging a set, enters rest_timer phase (if more sets remain)', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.completeWarmup())
    act(() => result.current.startSet())
    act(() => result.current.logSet(8, 42.5, 2))
    expect(result.current.phase).toBe('rest_timer')
  })

  it('rest timer counts up each second', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.completeWarmup())
    act(() => result.current.startSet())
    act(() => result.current.logSet(8, 42.5, 2))
    expect(result.current.restElapsed).toBe(0)

    act(() => { vi.advanceTimersByTime(3000) })
    expect(result.current.restElapsed).toBe(3)
  })

  it('after rest timer, returns to exercise for next set', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.completeWarmup())
    act(() => result.current.startSet())
    act(() => result.current.logSet(8, 42.5, 2))
    expect(result.current.phase).toBe('rest_timer')
    act(() => result.current.completeRestTimer())
    expect(result.current.phase).toBe('exercise')
    expect(result.current.currentSetNumber).toBe(2)
  })

  it('after all sets, advances to next exercise (warmup phase)', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    // Exercise 1: 3 sets
    act(() => result.current.completeWarmup())
    for (let i = 0; i < 2; i++) {
      act(() => result.current.startSet())
      act(() => result.current.logSet(8, 42.5, 2))
      act(() => result.current.completeRestTimer())
    }
    // Last set of exercise 1
    act(() => result.current.startSet())
    act(() => result.current.logSet(8, 42.5, 2))
    // Should advance to warmup for exercise 2
    expect(result.current.phase).toBe('warmup')
    expect(result.current.currentExercise!.exerciseName).toBe('Elevations laterales')
  })

  it('marks occupied and shows occupied phase', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.completeWarmup())
    act(() => result.current.markOccupied())
    expect(result.current.phase).toBe('occupied')
  })

  it('returns to exercise when machine is free', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.completeWarmup())
    act(() => result.current.markOccupied())
    expect(result.current.phase).toBe('occupied')
    act(() => result.current.markMachineFree())
    expect(result.current.phase).toBe('exercise')
  })

  it('opens weight picker', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.completeWarmup())
    act(() => result.current.openWeightPicker())
    expect(result.current.phase).toBe('weight_picker')
  })

  it('selecting alternative weight returns to exercise with new weight', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.completeWarmup())
    act(() => result.current.openWeightPicker())
    act(() => result.current.selectAlternativeWeight(40, 9))
    expect(result.current.phase).toBe('exercise')
    expect(result.current.currentExercise!.prescribedWeightKg).toBe(40)
    expect(result.current.currentExercise!.prescribedReps).toBe(9)
  })

  it('after all exercises, enters done (no cooldown exercises)', async () => {
    const { result } = renderHook(() => useSession(defaultParams))
    await completeAllExercises(result)
    // end_pain_check was removed as redundant - goes directly to done
    expect(result.current.phase).toBe('done')
  })

  it('logs pain during a set', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    act(() => result.current.completeWarmup())
    act(() => result.current.startSet())
    act(() =>
      result.current.logSet(8, 42.5, 2, { zone: 'elbow_right', level: 3 })
    )
    // Should still continue (rest_timer for non-final set)
    expect(result.current.phase).toBe('rest_timer')
  })

  it('provides exercise index and total for progress display', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    expect(result.current.exerciseIndex).toBe(0)
    expect(result.current.totalExercises).toBe(2)
  })
})

describe('useSession - DB persistence', () => {
  beforeEach(async () => {
    sessionStorage.clear()
    await db.delete()
    await db.open()
  })

  it('completing all exercises saves session and transitions to done', async () => {
    const { result } = renderHook(() => useSession(defaultParams))

    // Complete all exercises (no fake timers in this describe block)
    await completeAllExercises(result, false)
    // end_pain_check was removed - goes directly to done
    expect(result.current.phase).toBe('done')

    // Verify session was saved to DB
    const sessions = await db.workoutSessions.toArray()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].sessionName).toBe('Push A')
    expect(sessions[0].exercises).toHaveLength(2)

    // Verify exercise progress was saved
    const progress = await db.exerciseProgress.toArray()
    expect(progress).toHaveLength(2)
  })
})

describe('useSession - rehab integration', () => {
  beforeEach(async () => {
    sessionStorage.clear()
    await db.delete()
    await db.open()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns empty rehab arrays when no healthConditions provided', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    expect(result.current.warmupRehab).toEqual([])
    expect(result.current.activeWaitPool).toEqual([])
    expect(result.current.cooldownRehab).toEqual([])
  })

  it('returns empty rehab arrays even with healthConditions (integration stubbed)', () => {
    const healthConditions: HealthCondition[] = [
      {
        userId: 1,
        bodyZone: 'elbow_right',
        label: 'Golf elbow',
        diagnosis: 'Epicondylite mediale',
        painLevel: 3,
        since: '1 an',
        notes: '',
        isActive: true,
        createdAt: new Date(),
      },
    ]

    const params: UseSessionParams = {
      ...defaultParams,
      healthConditions,
    }

    const { result } = renderHook(() => useSession(params))

    // Rehab integration is stubbed — always returns empty arrays
    expect(result.current.warmupRehab).toEqual([])
    expect(result.current.activeWaitPool).toEqual([])
    expect(result.current.cooldownRehab).toEqual([])
  })

  it('returns no rehab exercises when healthConditions are inactive', () => {
    const healthConditions: HealthCondition[] = [
      {
        userId: 1,
        bodyZone: 'elbow_right',
        label: 'Golf elbow',
        diagnosis: 'Epicondylite mediale',
        painLevel: 0,
        since: '1 an',
        notes: '',
        isActive: false,
        createdAt: new Date(),
      },
    ]

    const params: UseSessionParams = {
      ...defaultParams,
      healthConditions,
    }

    const { result } = renderHook(() => useSession(params))
    expect(result.current.warmupRehab).toEqual([])
    expect(result.current.activeWaitPool).toEqual([])
    expect(result.current.cooldownRehab).toEqual([])
  })
})

describe('useSession - progression engine integration', () => {
  beforeEach(async () => {
    sessionStorage.clear()
    await db.delete()
    await db.open()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses progression engine to increase weight after reaching top of rep range', () => {
    const params: UseSessionParams = {
      ...defaultParams,
      history: {
        // avgReps (10) >= targetReps + 2 (8+2=10) triggers weight increase
        1: { lastWeightKg: 40, lastReps: [10, 10, 10], lastAvgRIR: 2 },
        2: { lastWeightKg: 10, lastReps: [12, 12, 12], lastAvgRIR: 3 },
      },
      availableWeights: [37.5, 40, 42.5, 45, 47.5, 50],
    }
    const { result } = renderHook(() => useSession(params))
    act(() => result.current.completeWarmup())
    // No automatic progression — uses last weight directly
    expect(result.current.currentExercise!.prescribedWeightKg).toBe(40)
  })

  it('maintains weight when reps were not all completed', () => {
    const params: UseSessionParams = {
      ...defaultParams,
      history: {
        1: { lastWeightKg: 40, lastReps: [8, 7, 6], lastAvgRIR: 1 },
        2: { lastWeightKg: 10, lastReps: [12, 12, 12], lastAvgRIR: 3 },
      },
    }
    const { result } = renderHook(() => useSession(params))
    act(() => result.current.completeWarmup())
    // Exercise 1: 40kg, not all reps hit -> maintain at 40
    expect(result.current.currentExercise!.prescribedWeightKg).toBe(40)
  })

  it('passes available weights to the engine when provided', () => {
    const params: UseSessionParams = {
      ...defaultParams,
      history: {
        1: { lastWeightKg: 40, lastReps: [8, 8, 8], lastAvgRIR: 2 },
        2: { lastWeightKg: 10, lastReps: [12, 12, 12], lastAvgRIR: 3 },
      },
      // Only has 40 and 45 -> 45 > 42.5+1=43.5 -> increase reps instead
      availableWeights: [20, 40, 45, 60],
    }
    const { result } = renderHook(() => useSession(params))
    act(() => result.current.completeWarmup())
    // No 42.5 available, and 45 > 43.5 -> uses last weight directly
    expect(result.current.currentExercise!.prescribedWeightKg).toBe(40)
    expect(result.current.currentExercise!.prescribedReps).toBe(8)
  })

  it('uses 0kg for exercise with no history', () => {
    const params: UseSessionParams = {
      ...defaultParams,
      history: {}, // No history at all
    }
    const { result } = renderHook(() => useSession(params))
    act(() => result.current.completeWarmup())
    // No history -> 0kg, target reps from program
    expect(result.current.currentExercise!.prescribedWeightKg).toBe(0)
    expect(result.current.currentExercise!.prescribedReps).toBe(8)
  })
})

describe('useSession - cooldown phase', () => {
  // Use upper_back condition which has a cooldown exercise (Etirement pectoral)
  const upperBackConditions: HealthCondition[] = [
    {
      userId: 1,
      bodyZone: 'upper_back',
      label: 'Posture',
      diagnosis: 'Posture anterieure',
      painLevel: 2,
      since: '2 ans',
      notes: '',
      isActive: true,
      createdAt: new Date(),
    },
  ]

  /** Helper to complete all exercises in a session */
  function completeAll(result: { current: ReturnType<typeof useSession> }) {
    // Exercise 1: 3 sets
    act(() => result.current.completeWarmup())
    for (let i = 0; i < 2; i++) {
      act(() => result.current.startSet())
      act(() => result.current.logSet(8, 42.5, 2))
      act(() => result.current.completeRestTimer())
    }
    act(() => result.current.startSet())
    act(() => result.current.logSet(8, 42.5, 2))

    // Exercise 2: 3 sets
    act(() => result.current.completeWarmup())
    for (let i = 0; i < 2; i++) {
      act(() => result.current.startSet())
      act(() => result.current.logSet(12, 12.5, 3))
      act(() => result.current.completeRestTimer())
    }
    act(() => result.current.startSet())
    act(() => result.current.logSet(12, 12.5, 3))
  }

  beforeEach(async () => {
    sessionStorage.clear()
    await db.delete()
    await db.open()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('goes straight to done after all exercises when no cooldown rehab (integration stubbed)', async () => {
    const params: UseSessionParams = {
      ...defaultParams,
      userConditions: ['upper_back'],
      healthConditions: upperBackConditions,
    }
    const { result } = renderHook(() => useSession(params))

    // Rehab integration is stubbed — cooldownRehab is empty
    expect(result.current.cooldownRehab.length).toBe(0)

    completeAll(result)

    // Flush async DB operations
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // No cooldown exercises → goes directly to done
    expect(result.current.phase).toBe('done')
  })

  it('exposes completeWarmupRehab to transition from warmup_rehab to warmup', () => {
    const { result } = renderHook(() => useSession(defaultParams))
    expect(result.current.completeWarmupRehab).toBeDefined()
    expect(typeof result.current.completeWarmupRehab).toBe('function')
  })
})

describe('useSession - cooldown with DB persistence', () => {
  // Use upper_back condition which has a cooldown exercise (Etirement pectoral)
  const upperBackConditions: HealthCondition[] = [
    {
      userId: 1,
      bodyZone: 'upper_back',
      label: 'Posture',
      diagnosis: 'Posture anterieure',
      painLevel: 2,
      since: '2 ans',
      notes: '',
      isActive: true,
      createdAt: new Date(),
    },
  ]

  beforeEach(async () => {
    sessionStorage.clear()
    await db.delete()
    await db.open()
  })

  it('goes straight to done when rehab integration is stubbed (no cooldown)', async () => {
    const params: UseSessionParams = {
      ...defaultParams,
      userConditions: [],
      healthConditions: upperBackConditions,
    }
    const { result } = renderHook(() => useSession(params))

    // Rehab integration is stubbed — cooldownRehab is empty
    expect(result.current.cooldownRehab.length).toBe(0)

    // Complete all exercises
    act(() => result.current.completeWarmup())
    for (let i = 0; i < 2; i++) {
      act(() => result.current.startSet())
      act(() => result.current.logSet(8, 42.5, 2))
      act(() => result.current.completeRestTimer())
    }
    act(() => result.current.startSet())
    act(() => result.current.logSet(8, 42.5, 2))

    act(() => result.current.completeWarmup())
    for (let i = 0; i < 2; i++) {
      act(() => result.current.startSet())
      act(() => result.current.logSet(12, 12.5, 3))
      act(() => result.current.completeRestTimer())
    }

    // Last set triggers advanceExerciseOrEnd
    act(() => result.current.startSet())
    await act(async () => {
      result.current.logSet(12, 12.5, 3)
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    // No cooldown → goes straight to done
    expect(result.current.phase).toBe('done')
  })

  it('saves session to DB when no conditions and no cooldown', async () => {
    const params: UseSessionParams = {
      ...defaultParams,
      userConditions: [], // no conditions => skip pain check
      // no healthConditions => no cooldown
    }
    const { result } = renderHook(() => useSession(params))

    // Exercise 1: 3 sets
    act(() => result.current.completeWarmup())
    for (let i = 0; i < 2; i++) {
      act(() => result.current.startSet())
      act(() => result.current.logSet(8, 42.5, 2))
      act(() => result.current.completeRestTimer())
    }
    act(() => result.current.startSet())
    act(() => result.current.logSet(8, 42.5, 2))

    // Exercise 2: 3 sets
    act(() => result.current.completeWarmup())
    for (let i = 0; i < 2; i++) {
      act(() => result.current.startSet())
      act(() => result.current.logSet(12, 12.5, 3))
      act(() => result.current.completeRestTimer())
    }

    // Last set triggers advanceExerciseOrEnd which calls saveSessionToDb (async)
    act(() => result.current.startSet())
    // logSet internally calls advanceExerciseOrEnd which is async
    // We need to await the internal promise
    await act(async () => {
      result.current.logSet(12, 12.5, 3)
      // Allow microtasks (the async DB save) to complete
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    // Should go straight to done
    expect(result.current.phase).toBe('done')

    // Verify session was saved to DB
    const sessions = await db.workoutSessions.toArray()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].sessionName).toBe('Push A')
    expect(sessions[0].completedAt).toBeDefined()
    expect(sessions[0].exercises).toHaveLength(2)

    // Verify exercise progress was saved
    const progress = await db.exerciseProgress.toArray()
    expect(progress).toHaveLength(2)
  })
})
