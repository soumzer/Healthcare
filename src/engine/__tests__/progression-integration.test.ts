import { describe, it, expect } from 'vitest'
import {
  calculateProgression,
  shouldDeload,
  getPhaseRecommendation,
  type ProgressionInput,
} from '../progression'
import { SessionEngine, type ExerciseHistory } from '../session-engine'
import type { ProgramSession } from '../../db/types'

// Shared test fixtures
const availableWeights = [
  0, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30,
  32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 52.5, 55, 57.5, 60,
  62.5, 65, 67.5, 70, 72.5, 75, 77.5, 80,
]

const testSession: ProgramSession = {
  name: 'Upper 1',
  order: 0,
  exercises: [
    { exerciseId: 1, order: 1, sets: 4, targetReps: 8, restSeconds: 120, isRehab: false },
    { exerciseId: 2, order: 2, sets: 3, targetReps: 12, restSeconds: 90, isRehab: false },
    { exerciseId: 3, order: 3, sets: 3, targetReps: 10, restSeconds: 90, isRehab: false },
  ],
}

describe('Progression integration: end-to-end weight increase after successful sessions', () => {
  it('after 2 successful sessions with RIR >= 2, prescribed weight increases', () => {
    // === Session 1: User performs well at 40kg ===
    const session1Input: ProgressionInput = {
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 8, 8], // All reps completed
      avgRIR: 2.5,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights,
      phase: 'hypertrophy',
    }

    const result1 = calculateProgression(session1Input)
    expect(result1.action).toBe('increase_weight')
    expect(result1.nextWeightKg).toBe(42.5)

    // === Session 2: User performs well at 42.5kg (the new weight) ===
    const session2Input: ProgressionInput = {
      prescribedWeightKg: 42.5,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 8, 8], // All reps completed again
      avgRIR: 2,
      avgRestSeconds: 125,
      prescribedRestSeconds: 120,
      availableWeights,
      phase: 'hypertrophy',
    }

    const result2 = calculateProgression(session2Input)
    expect(result2.action).toBe('increase_weight')
    expect(result2.nextWeightKg).toBe(45)

    // Verify: 40 -> 42.5 -> 45kg over 2 sessions
    expect(result2.nextWeightKg).toBeGreaterThan(session1Input.prescribedWeightKg)
  })

  it('weight increases are applied correctly through SessionEngine with history', () => {
    // Simulate: after session 1 at 60kg, all reps hit, RIR=2
    const historyAfterSession1: ExerciseHistory = {
      1: {
        lastWeightKg: 60,
        lastReps: [8, 8, 8, 8],
        lastAvgRIR: 2,
        lastAvgRestSeconds: 120,
        prescribedRestSeconds: 120,
        prescribedSets: 4,
        prescribedReps: 8,
      },
    }

    const engine1 = new SessionEngine(testSession, historyAfterSession1, { availableWeights })
    const exercise1 = engine1.getCurrentExercise()
    expect(exercise1.prescribedWeightKg).toBe(62.5) // Increased from 60

    // Now simulate: after session 2 at 62.5kg, all reps hit, RIR=2
    const historyAfterSession2: ExerciseHistory = {
      1: {
        lastWeightKg: 62.5,
        lastReps: [8, 8, 8, 8],
        lastAvgRIR: 2,
        lastAvgRestSeconds: 118,
        prescribedRestSeconds: 120,
        prescribedSets: 4,
        prescribedReps: 8,
      },
    }

    const engine2 = new SessionEngine(testSession, historyAfterSession2, { availableWeights })
    const exercise2 = engine2.getCurrentExercise()
    expect(exercise2.prescribedWeightKg).toBe(65) // Increased from 62.5
  })
})

describe('Progression integration: pain blocks progression', () => {
  it('if pain was reported during sets, weight does NOT increase', () => {
    // Pain is signaled by avgRIR = -1 in ExerciseProgress (set in useSession)
    // When we read this back as history, the avgRIR is -1, which is < 1
    // The progression engine should maintain weight

    const historyWithPain: ExerciseHistory = {
      1: {
        lastWeightKg: 60,
        lastReps: [8, 8, 8, 8],
        lastAvgRIR: -1, // Pain marker: avgRIR set to -1 when pain reported
        lastAvgRestSeconds: 120,
        prescribedRestSeconds: 120,
        prescribedSets: 4,
        prescribedReps: 8,
      },
    }

    const engine = new SessionEngine(testSession, historyWithPain, { availableWeights })
    const exercise = engine.getCurrentExercise()

    // Pain means avgRIR < 1 -> maintain weight
    expect(exercise.prescribedWeightKg).toBe(60)

    const result = engine.getProgressionResult(1)
    expect(result).toBeDefined()
    expect(result!.action).toBe('maintain')
  })

  it('calculateProgression maintains when avgRIR is negative (pain marker)', () => {
    const input: ProgressionInput = {
      prescribedWeightKg: 60,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 8, 8],
      avgRIR: -1, // Pain occurred
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights,
      phase: 'hypertrophy',
    }

    const result = calculateProgression(input)
    expect(result.action).toBe('maintain')
    expect(result.nextWeightKg).toBe(60) // No change
  })

  it('pain in some sets (avgRIR driven very low) also blocks progression', () => {
    // Even if not using the -1 marker, a very low RIR from pain-inhibited performance
    const input: ProgressionInput = {
      prescribedWeightKg: 50,
      prescribedReps: 10,
      prescribedSets: 3,
      actualReps: [10, 10, 10], // Reps completed but...
      avgRIR: 0.3, // Very low RIR (< 1), indicating maximal/painful effort
      avgRestSeconds: 90,
      prescribedRestSeconds: 90,
      availableWeights,
      phase: 'hypertrophy',
    }

    const result = calculateProgression(input)
    expect(result.action).toBe('maintain')
    expect(result.nextWeightKg).toBe(50)
  })
})

describe('Progression integration: deload after 5 weeks', () => {
  it('shouldDeload returns true after 5 weeks', () => {
    expect(shouldDeload(4)).toBe(false)
    expect(shouldDeload(5)).toBe(true)
    expect(shouldDeload(6)).toBe(true)
    expect(shouldDeload(8)).toBe(true)
  })

  it('shouldDeload returns false for fewer than 5 weeks', () => {
    expect(shouldDeload(0)).toBe(false)
    expect(shouldDeload(1)).toBe(false)
    expect(shouldDeload(2)).toBe(false)
    expect(shouldDeload(3)).toBe(false)
  })

  it('during deload, SessionEngine prescribes ~60% of normal weight', () => {
    const history: ExerciseHistory = {
      1: {
        lastWeightKg: 60,
        lastReps: [8, 8, 8, 8],
        lastAvgRIR: 2,
        lastAvgRestSeconds: 120,
        prescribedRestSeconds: 120,
        prescribedSets: 4,
        prescribedReps: 8,
      },
      2: {
        lastWeightKg: 40,
        lastReps: [12, 12, 12],
        lastAvgRIR: 2,
        lastAvgRestSeconds: 90,
        prescribedRestSeconds: 90,
        prescribedSets: 3,
        prescribedReps: 12,
      },
      3: {
        lastWeightKg: 30,
        lastReps: [10, 10, 10],
        lastAvgRIR: 3,
        lastAvgRestSeconds: 85,
        prescribedRestSeconds: 90,
        prescribedSets: 3,
        prescribedReps: 10,
      },
    }

    // Normal mode: would increase weight
    const normalEngine = new SessionEngine(testSession, history, {
      availableWeights,
      phase: 'hypertrophy',
    })
    expect(normalEngine.getCurrentExercise().prescribedWeightKg).toBe(62.5) // 60 + 2.5

    // Deload mode: should reduce to ~60% of last weight
    const deloadEngine = new SessionEngine(testSession, history, {
      availableWeights,
      phase: 'deload',
    })

    const ex1 = deloadEngine.getCurrentExercise()
    // 60 * 0.6 = 36 -> closest available at or below = 35
    expect(ex1.prescribedWeightKg).toBeLessThanOrEqual(36)
    expect(ex1.prescribedWeightKg).toBeGreaterThanOrEqual(30) // Reasonable deload range
    // Reps should stay at program target (8)
    expect(ex1.prescribedReps).toBe(8)

    // Check exercise 2: 40 * 0.6 = 24 -> closest at or below = 22.5
    deloadEngine.completeExercise()
    const ex2 = deloadEngine.getCurrentExercise()
    expect(ex2.prescribedWeightKg).toBeLessThanOrEqual(24)
    expect(ex2.prescribedWeightKg).toBeGreaterThanOrEqual(20)
    expect(ex2.prescribedReps).toBe(12) // Program target reps

    // Check exercise 3: 30 * 0.6 = 18 -> closest at or below = 17.5
    deloadEngine.completeExercise()
    const ex3 = deloadEngine.getCurrentExercise()
    expect(ex3.prescribedWeightKg).toBeLessThanOrEqual(18)
    expect(ex3.prescribedWeightKg).toBeGreaterThanOrEqual(15)
    expect(ex3.prescribedReps).toBe(10)
  })

  it('deload weights are at exactly 60% rounded to nearest available weight', () => {
    const history: ExerciseHistory = {
      1: {
        lastWeightKg: 100,
        lastReps: [8, 8, 8, 8],
        lastAvgRIR: 2,
      },
    }

    const engine = new SessionEngine(testSession, history, {
      availableWeights,
      phase: 'deload',
    })

    // 100 * 0.6 = 60 -> exact match available
    expect(engine.getCurrentExercise().prescribedWeightKg).toBe(60)
  })

  it('after a full 5-week cycle, deload triggers and weights drop', () => {
    // Simulate the scenario: 5 weeks of training without deload
    expect(shouldDeload(5)).toBe(true)

    // The user's last session at 70kg
    const history: ExerciseHistory = {
      1: {
        lastWeightKg: 70,
        lastReps: [8, 8, 8, 8],
        lastAvgRIR: 2,
        lastAvgRestSeconds: 120,
        prescribedRestSeconds: 120,
      },
    }

    // Since deload is triggered, phase='deload' should be passed
    const engine = new SessionEngine(testSession, history, {
      availableWeights,
      phase: 'deload',
    })

    // 70 * 0.6 = 42, round(42 * 2) / 2 = 42 (not in available weights)
    // Available: ...40, 42.5, 45... -> filter(w <= 42) -> highest is 40
    const ex = engine.getCurrentExercise()
    expect(ex.prescribedWeightKg).toBe(40)
  })
})

describe('Progression integration: rest inflation blocks progression', () => {
  it('rest inflated (>1.5x prescribed) means no weight increase', () => {
    const input: ProgressionInput = {
      prescribedWeightKg: 50,
      prescribedReps: 10,
      prescribedSets: 3,
      actualReps: [10, 10, 10], // All reps completed
      avgRIR: 2, // Good RIR
      avgRestSeconds: 200, // Way more than prescribed (90 * 1.5 = 135)
      prescribedRestSeconds: 90,
      availableWeights,
      phase: 'hypertrophy',
    }

    const result = calculateProgression(input)
    expect(result.action).toBe('maintain')
    expect(result.nextWeightKg).toBe(50) // No increase
    expect(result.reason).toContain('Repos')
  })

  it('rest at exactly 1.5x is NOT inflated (threshold is strictly greater)', () => {
    const input: ProgressionInput = {
      prescribedWeightKg: 50,
      prescribedReps: 10,
      prescribedSets: 3,
      actualReps: [10, 10, 10],
      avgRIR: 2,
      avgRestSeconds: 135, // Exactly 90 * 1.5 = 135 (not > 135)
      prescribedRestSeconds: 90,
      availableWeights,
      phase: 'hypertrophy',
    }

    const result = calculateProgression(input)
    // 135 > 90 * 1.5 is false (135 > 135 is false), so not inflated
    expect(result.action).toBe('increase_weight')
    expect(result.nextWeightKg).toBe(52.5)
  })

  it('rest slightly above 1.5x is inflated', () => {
    const input: ProgressionInput = {
      prescribedWeightKg: 50,
      prescribedReps: 10,
      prescribedSets: 3,
      actualReps: [10, 10, 10],
      avgRIR: 2,
      avgRestSeconds: 136, // Just above 135 threshold
      prescribedRestSeconds: 90,
      availableWeights,
      phase: 'hypertrophy',
    }

    const result = calculateProgression(input)
    expect(result.action).toBe('maintain')
    expect(result.nextWeightKg).toBe(50)
  })

  it('rest inflation detected through SessionEngine history', () => {
    const history: ExerciseHistory = {
      1: {
        lastWeightKg: 60,
        lastReps: [8, 8, 8, 8],
        lastAvgRIR: 2,
        lastAvgRestSeconds: 250, // Way above prescribed
        prescribedRestSeconds: 120, // 120 * 1.5 = 180, 250 > 180
        prescribedSets: 4,
        prescribedReps: 8,
      },
    }

    const engine = new SessionEngine(testSession, history, { availableWeights })
    const exercise = engine.getCurrentExercise()

    // Despite perfect reps and good RIR, rest was inflated -> maintain
    expect(exercise.prescribedWeightKg).toBe(60)
    const result = engine.getProgressionResult(1)
    expect(result!.action).toBe('maintain')
  })
})

describe('Progression integration: regression handling', () => {
  it('significant rep deficit (>25%) triggers weight decrease', () => {
    const input: ProgressionInput = {
      prescribedWeightKg: 60,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [6, 5, 4, 3], // Total: 18, prescribed: 32, deficit: 43.75%
      avgRIR: 0,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights,
      phase: 'hypertrophy',
    }

    const result = calculateProgression(input)
    expect(result.action).toBe('decrease')
    expect(result.nextWeightKg).toBe(57.5)
    expect(result.nextWeightKg).toBeLessThan(60)
  })

  it('moderate rep deficit (<= 25%) does not trigger regression', () => {
    const input: ProgressionInput = {
      prescribedWeightKg: 60,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 7, 7], // Total: 30, prescribed: 32, deficit: 6.25%
      avgRIR: 1,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights,
      phase: 'hypertrophy',
    }

    const result = calculateProgression(input)
    // Not all reps hit (7 < 8), avgRIR = 1 (< 1 is false, but allSetsCompleted is false)
    expect(result.action).toBe('maintain')
    expect(result.nextWeightKg).toBe(60)
  })
})

describe('Phase transition logic', () => {
  it('recommends transition after 6 weeks of successful hypertrophy', () => {
    const result = getPhaseRecommendation({
      currentPhase: 'hypertrophy',
      weeksInPhase: 6,
      avgPainLevel: 0,
      progressionConsistency: 0.8,
    })
    expect(result).toBe('transition')
  })

  it('stays in hypertrophy if consistency is low', () => {
    const result = getPhaseRecommendation({
      currentPhase: 'hypertrophy',
      weeksInPhase: 8,
      avgPainLevel: 0,
      progressionConsistency: 0.5, // Below 0.7 threshold
    })
    expect(result).toBe('hypertrophy')
  })

  it('stays in current phase if pain level is high', () => {
    const result = getPhaseRecommendation({
      currentPhase: 'hypertrophy',
      weeksInPhase: 10,
      avgPainLevel: 3, // Above threshold of 2
      progressionConsistency: 0.9,
    })
    expect(result).toBe('hypertrophy')
  })

  it('recommends strength after 4 weeks of successful transition', () => {
    const result = getPhaseRecommendation({
      currentPhase: 'transition',
      weeksInPhase: 4,
      avgPainLevel: 0,
      progressionConsistency: 0.75,
    })
    expect(result).toBe('strength')
  })

  it('stays in transition if not enough weeks', () => {
    const result = getPhaseRecommendation({
      currentPhase: 'transition',
      weeksInPhase: 3,
      avgPainLevel: 0,
      progressionConsistency: 0.9,
    })
    expect(result).toBe('transition')
  })

  it('strength phase stays in strength (no further transition)', () => {
    const result = getPhaseRecommendation({
      currentPhase: 'strength',
      weeksInPhase: 10,
      avgPainLevel: 0,
      progressionConsistency: 0.9,
    })
    expect(result).toBe('strength')
  })
})

describe('Progression integration: multi-exercise session flow', () => {
  it('each exercise gets independent progression based on its own history', () => {
    const history: ExerciseHistory = {
      // Exercise 1: good performance -> should increase
      1: {
        lastWeightKg: 60,
        lastReps: [8, 8, 8, 8],
        lastAvgRIR: 2,
        lastAvgRestSeconds: 120,
        prescribedRestSeconds: 120,
        prescribedSets: 4,
        prescribedReps: 8,
      },
      // Exercise 2: struggled -> should maintain
      2: {
        lastWeightKg: 40,
        lastReps: [12, 11, 10],
        lastAvgRIR: 0.5, // Very hard
        lastAvgRestSeconds: 90,
        prescribedRestSeconds: 90,
        prescribedSets: 3,
        prescribedReps: 12,
      },
      // Exercise 3: regressed -> should decrease
      3: {
        lastWeightKg: 30,
        lastReps: [7, 5, 4], // Deficit: 1 - 16/30 = 0.467 > 0.25
        lastAvgRIR: 0,
        lastAvgRestSeconds: 90,
        prescribedRestSeconds: 90,
        prescribedSets: 3,
        prescribedReps: 10,
      },
    }

    const engine = new SessionEngine(testSession, history, { availableWeights })

    // Exercise 1: increased
    const ex1 = engine.getCurrentExercise()
    expect(ex1.prescribedWeightKg).toBe(62.5)
    expect(engine.getProgressionResult(1)!.action).toBe('increase_weight')

    engine.completeExercise()

    // Exercise 2: maintained (low RIR)
    const ex2 = engine.getCurrentExercise()
    expect(ex2.prescribedWeightKg).toBe(40)
    expect(engine.getProgressionResult(2)!.action).toBe('maintain')

    engine.completeExercise()

    // Exercise 3: decreased
    const ex3 = engine.getCurrentExercise()
    expect(ex3.prescribedWeightKg).toBe(27.5)
    expect(engine.getProgressionResult(3)!.action).toBe('decrease')
  })
})
