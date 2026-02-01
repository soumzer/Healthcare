import { describe, it, expect } from 'vitest'
import { SessionEngine, type ExerciseHistory } from './session-engine'
import type { PainAdjustment } from './pain-feedback'
import type { ProgramSession } from '../db/types'

describe('SessionEngine', () => {
  const mockSession: ProgramSession = {
    name: 'Push A',
    order: 1,
    exercises: [
      { exerciseId: 1, order: 1, sets: 4, targetReps: 8, restSeconds: 120, isRehab: false },
      { exerciseId: 2, order: 2, sets: 3, targetReps: 12, restSeconds: 90, isRehab: false },
      { exerciseId: 3, order: 3, sets: 3, targetReps: 15, restSeconds: 60, isRehab: true },
    ],
  }

  it('returns first exercise when session starts', () => {
    const engine = new SessionEngine(mockSession, {})
    const current = engine.getCurrentExercise()
    expect(current.exerciseId).toBe(1)
    expect(current.prescribedSets).toBe(4)
  })

  it('advances to next exercise when current is completed', () => {
    const engine = new SessionEngine(mockSession, {})
    engine.completeExercise()
    expect(engine.getCurrentExercise().exerciseId).toBe(2)
  })

  it('returns session complete when all exercises done', () => {
    const engine = new SessionEngine(mockSession, {})
    engine.completeExercise()
    engine.completeExercise()
    engine.completeExercise()
    expect(engine.isSessionComplete()).toBe(true)
  })

  it('marks exercise as occupied without changing order', () => {
    const engine = new SessionEngine(mockSession, {})
    engine.markOccupied()
    expect(engine.getCurrentExercise().exerciseId).toBe(1)
    expect(engine.isWaitingForMachine()).toBe(true)
  })

  it('clears occupied state when machine is free', () => {
    const engine = new SessionEngine(mockSession, {})
    engine.markOccupied()
    engine.markMachineFree()
    expect(engine.isWaitingForMachine()).toBe(false)
  })

  it('logs sets and tracks completion', () => {
    const engine = new SessionEngine(mockSession, {})
    for (let i = 0; i < 4; i++) {
      engine.logSet({
        setNumber: i + 1,
        prescribedReps: 8,
        prescribedWeightKg: 40,
        actualReps: 8,
        actualWeightKg: 40,
        repsInReserve: 2,
        painReported: false,
        restPrescribedSeconds: 120,
        restActualSeconds: 120,
        completedAt: new Date(),
      })
    }
    expect(engine.isCurrentExerciseComplete()).toBe(true)
  })

  it('calculates prescribed weight from history using progression engine', () => {
    const history: ExerciseHistory = {
      1: { lastWeightKg: 40, lastReps: [8, 8, 8, 8], lastAvgRIR: 2 }
    }
    const engine = new SessionEngine(mockSession, history)
    // Progression engine: all reps hit, avgRIR >= 1, no rest inflation -> increase_weight
    // Default weights include 42.5 (generated from 40 in 2.5 increments)
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(42.5)
  })

  it('maintains weight when history shows incomplete reps', () => {
    const history: ExerciseHistory = {
      1: { lastWeightKg: 40, lastReps: [8, 8, 7, 6], lastAvgRIR: 1 }
    }
    const engine = new SessionEngine(mockSession, history)
    // Not all sets completed (7 < 8, 6 < 8) -> maintain
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(40)
  })

  it('prescribes 0kg for new exercises with no history', () => {
    const engine = new SessionEngine(mockSession, {})
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(0)
  })

  it('returns correct current set number', () => {
    const engine = new SessionEngine(mockSession, {})
    expect(engine.getCurrentSetNumber()).toBe(1)
    engine.logSet({
      setNumber: 1, prescribedReps: 8, prescribedWeightKg: 40,
      actualReps: 8, actualWeightKg: 40, repsInReserve: 2,
      painReported: false, restPrescribedSeconds: 120, completedAt: new Date(),
    })
    expect(engine.getCurrentSetNumber()).toBe(2)
  })
})

describe('SessionEngine - progression engine integration', () => {
  const mockSession: ProgramSession = {
    name: 'Lower 1',
    order: 0,
    exercises: [
      { exerciseId: 10, order: 1, sets: 4, targetReps: 8, restSeconds: 120, isRehab: false },
      { exerciseId: 20, order: 2, sets: 3, targetReps: 12, restSeconds: 90, isRehab: false },
    ],
  }

  it('increases weight after a successful session (all reps hit, good RIR)', () => {
    const history: ExerciseHistory = {
      10: { lastWeightKg: 60, lastReps: [8, 8, 8, 8], lastAvgRIR: 2 },
      20: { lastWeightKg: 30, lastReps: [12, 12, 12], lastAvgRIR: 3 },
    }
    const engine = new SessionEngine(mockSession, history)
    // Exercise 10: all reps hit, good RIR -> should increase
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(62.5)
    // Check progression result is available
    const result = engine.getProgressionResult(10)
    expect(result).toBeDefined()
    expect(result!.action).toBe('increase_weight')
  })

  it('maintains weight when effort was maximal (low RIR)', () => {
    const history: ExerciseHistory = {
      10: { lastWeightKg: 60, lastReps: [8, 8, 8, 8], lastAvgRIR: 0.5 },
    }
    const engine = new SessionEngine(mockSession, history)
    // All reps hit but avgRIR < 1 -> maintain
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(60)
    const result = engine.getProgressionResult(10)
    expect(result!.action).toBe('maintain')
  })

  it('decreases weight when regression is significant (>25% rep deficit)', () => {
    const history: ExerciseHistory = {
      10: { lastWeightKg: 60, lastReps: [5, 4, 3, 2], lastAvgRIR: 0 },
    }
    const availableWeights = [20, 30, 40, 50, 55, 57.5, 60, 62.5, 65]
    const engine = new SessionEngine(mockSession, history, { availableWeights })
    // Total prescribed: 4*8=32, total actual: 14, deficit: 1-14/32 = 0.5625 > 0.25
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(57.5)
    const result = engine.getProgressionResult(10)
    expect(result!.action).toBe('decrease')
  })

  it('maintains weight when rest was inflated (>1.5x prescribed)', () => {
    const history: ExerciseHistory = {
      10: {
        lastWeightKg: 60,
        lastReps: [8, 8, 8, 8],
        lastAvgRIR: 2,
        lastAvgRestSeconds: 300, // 300s avg rest
        prescribedRestSeconds: 120, // 120s prescribed -> 300 > 180 (1.5x)
      },
    }
    const engine = new SessionEngine(mockSession, history)
    // Rest inflated: 300 > 120 * 1.5 = 180 -> maintain despite good performance
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(60)
    const result = engine.getProgressionResult(10)
    expect(result!.action).toBe('maintain')
  })

  it('uses available weights from options when provided', () => {
    const history: ExerciseHistory = {
      10: { lastWeightKg: 60, lastReps: [8, 8, 8, 8], lastAvgRIR: 2 },
    }
    // Only 65 is the next weight above 60 (no 62.5)
    const availableWeights = [20, 40, 60, 65, 80]
    const engine = new SessionEngine(mockSession, history, { availableWeights })
    // Next weight available above 60 is 65, and 65 <= 62.5 + 1 = 63.5? No: 65 > 63.5
    // So it should increase reps instead
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(60)
    const result = engine.getProgressionResult(10)
    expect(result!.action).toBe('increase_reps')
    expect(result!.nextReps).toBe(9) // prescribedReps + 1
  })

  it('uses the training phase from options', () => {
    const history: ExerciseHistory = {
      10: { lastWeightKg: 60, lastReps: [8, 8, 8, 8], lastAvgRIR: 2 },
    }
    // In strength phase, max reps is 8 (not 15 for hypertrophy)
    // Only large jump available -> should hit max reps cap in strength
    const availableWeights = [20, 40, 60, 80]
    const engine = new SessionEngine(mockSession, history, {
      availableWeights,
      phase: 'strength',
    })
    // Next weight (80) is way above 62.5+1 = 63.5
    // So increase reps, but max reps in strength = 8, prescribedReps is already 8
    // -> maintain (at rep cap)
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(60)
    const result = engine.getProgressionResult(10)
    expect(result!.action).toBe('maintain')
    expect(result!.reason).toContain('Plafond de reps')
  })

  it('preserves prescribed reps from program for new exercises', () => {
    // No history -> use program exercise target reps
    const engine = new SessionEngine(mockSession, {})
    expect(engine.getCurrentExercise().prescribedReps).toBe(8)
    engine.completeExercise()
    expect(engine.getCurrentExercise().prescribedReps).toBe(12)
  })

  it('may adjust prescribed reps when progression recommends it', () => {
    const history: ExerciseHistory = {
      10: { lastWeightKg: 60, lastReps: [8, 8, 8, 8], lastAvgRIR: 2 },
    }
    // No weight above 60 within range -> increase reps
    const availableWeights = [20, 40, 60, 80]
    const engine = new SessionEngine(mockSession, history, { availableWeights })
    const result = engine.getProgressionResult(10)
    expect(result!.action).toBe('increase_reps')
    expect(engine.getCurrentExercise().prescribedReps).toBe(9)
  })
})

describe('SessionEngine - applyPainAdjustments', () => {
  const mockSession: ProgramSession = {
    name: 'Full Body',
    order: 0,
    exercises: [
      { exerciseId: 1, order: 1, sets: 4, targetReps: 8, restSeconds: 120, isRehab: false },
      { exerciseId: 2, order: 2, sets: 3, targetReps: 12, restSeconds: 90, isRehab: false },
    ],
  }

  it('reduces prescribed weight when action is reduce_weight', () => {
    const history: ExerciseHistory = {
      1: { lastWeightKg: 100, lastReps: [8, 8, 8, 8], lastAvgRIR: 2 },
      2: { lastWeightKg: 40, lastReps: [12, 12, 12], lastAvgRIR: 3 },
    }
    const engine = new SessionEngine(mockSession, history)

    // Exercise 1 should have progressed to 102.5 (from progression engine)
    const beforeWeight = engine.getCurrentExercise().prescribedWeightKg
    expect(beforeWeight).toBe(102.5)

    const adjustments: PainAdjustment[] = [
      {
        exerciseId: 1,
        exerciseName: 'Back squat barre',
        action: 'reduce_weight',
        reason: 'Douleur moderee sur lower_back',
        weightMultiplier: 0.8,
      },
    ]

    engine.applyPainAdjustments(adjustments)

    // 102.5 * 0.8 = 82, rounded to nearest 0.5 = 82
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(82)
  })

  it('does not modify weight for skip or no_progression actions', () => {
    const history: ExerciseHistory = {
      1: { lastWeightKg: 100, lastReps: [8, 8, 8, 8], lastAvgRIR: 2 },
      2: { lastWeightKg: 40, lastReps: [12, 12, 12], lastAvgRIR: 3 },
    }
    const engine = new SessionEngine(mockSession, history)
    const beforeWeight = engine.getCurrentExercise().prescribedWeightKg

    const adjustments: PainAdjustment[] = [
      {
        exerciseId: 1,
        exerciseName: 'Back squat barre',
        action: 'skip',
        reason: 'Douleur elevee',
      },
    ]

    engine.applyPainAdjustments(adjustments)

    // Weight should remain unchanged for skip action
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(beforeWeight)
  })

  it('ignores adjustments for exercises not in the session', () => {
    const engine = new SessionEngine(mockSession, {})

    const adjustments: PainAdjustment[] = [
      {
        exerciseId: 999,
        exerciseName: 'Nonexistent',
        action: 'reduce_weight',
        reason: 'test',
        weightMultiplier: 0.8,
      },
    ]

    // Should not throw
    engine.applyPainAdjustments(adjustments)
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(0)
  })

  it('rounds reduced weight to nearest 0.5kg', () => {
    const history: ExerciseHistory = {
      1: { lastWeightKg: 47.5, lastReps: [8, 8, 8, 8], lastAvgRIR: 2 },
    }
    const engine = new SessionEngine(mockSession, history)

    const adjustments: PainAdjustment[] = [
      {
        exerciseId: 1,
        exerciseName: 'Test',
        action: 'reduce_weight',
        reason: 'test',
        weightMultiplier: 0.8,
      },
    ]

    engine.applyPainAdjustments(adjustments)

    // 50 * 0.8 = 40, or 47.5 progressed -> 50 -> 50*0.8=40
    const weight = engine.getCurrentExercise().prescribedWeightKg
    // Weight should be rounded to nearest 0.5
    expect(weight * 2).toBe(Math.round(weight * 2))
  })
})
