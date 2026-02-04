import { describe, it, expect } from 'vitest'
import { SessionEngine, type ExerciseHistory } from './session-engine'
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

  it('uses last session weight from history (no automatic progression)', () => {
    const history: ExerciseHistory = {
      1: { lastWeightKg: 40, lastReps: [10, 10, 10, 10], lastAvgRIR: 2 }
    }
    const engine = new SessionEngine(mockSession, history)
    // Without automatic progression, should use last session's weight
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(40)
  })

  it('uses last session weight regardless of rep performance', () => {
    const history: ExerciseHistory = {
      1: { lastWeightKg: 40, lastReps: [8, 8, 7, 6], lastAvgRIR: 1 }
    }
    const engine = new SessionEngine(mockSession, history)
    // Without automatic progression, always use last session's weight
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

describe('SessionEngine - without automatic progression', () => {
  const mockSession: ProgramSession = {
    name: 'Lower 1',
    order: 0,
    exercises: [
      { exerciseId: 10, order: 1, sets: 4, targetReps: 8, restSeconds: 120, isRehab: false },
      { exerciseId: 20, order: 2, sets: 3, targetReps: 12, restSeconds: 90, isRehab: false },
    ],
  }

  it('uses last session weight from history regardless of performance', () => {
    const history: ExerciseHistory = {
      10: { lastWeightKg: 60, lastReps: [10, 10, 10, 10], lastAvgRIR: 2 },
      20: { lastWeightKg: 30, lastReps: [14, 14, 14], lastAvgRIR: 3 },
    }
    const engine = new SessionEngine(mockSession, history)
    // Without progression engine, should use last session's weight directly
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(60)
  })

  it('uses program target reps regardless of history', () => {
    const history: ExerciseHistory = {
      10: { lastWeightKg: 60, lastReps: [8, 8, 8, 8], lastAvgRIR: 2 },
    }
    const availableWeights = [20, 40, 60, 80]
    const engine = new SessionEngine(mockSession, history, { availableWeights })
    // Without progression engine, reps should be program target (8), not adjusted
    expect(engine.getCurrentExercise().prescribedReps).toBe(8)
  })

  it('preserves prescribed reps from program for new exercises', () => {
    // No history -> use program exercise target reps
    const engine = new SessionEngine(mockSession, {})
    expect(engine.getCurrentExercise().prescribedReps).toBe(8)
    engine.completeExercise()
    expect(engine.getCurrentExercise().prescribedReps).toBe(12)
  })
})
