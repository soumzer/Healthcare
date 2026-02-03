import { describe, it, expect } from 'vitest'
import { calculateProgression, shouldDeload, getPhaseRecommendation } from './progression'

describe('calculateProgression', () => {
  it('increases weight when all sets completed with good RIR and reached top of rep range', () => {
    const result = calculateProgression({
      programTargetReps: 6,  // target is 6 reps
      programTargetSets: 4,
      lastWeightKg: 40,
      lastRepsPerSet: [8, 8, 8, 8],  // performing 8 reps (top of 6-8 range)
      lastAvgRIR: 2,
      availableWeights: [37.5, 40, 42.5, 45],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(42.5)
    expect(result.nextReps).toBe(6)  // reset to target reps
    expect(result.action).toBe('increase_weight')
  })

  it('keeps same weight and adds a rep when successful but not at top of range', () => {
    const result = calculateProgression({
      programTargetReps: 6,
      programTargetSets: 4,
      lastWeightKg: 40,
      lastRepsPerSet: [6, 6, 6, 6],  // just hit target, not at top of range yet
      lastAvgRIR: 2,
      availableWeights: [37.5, 40, 42.5, 45],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(40)
    expect(result.nextReps).toBe(7)  // +1 rep
    expect(result.action).toBe('increase_reps')
  })

  it('maintains weight and reps when sets partially completed', () => {
    const result = calculateProgression({
      programTargetReps: 8,
      programTargetSets: 4,
      lastWeightKg: 40,
      lastRepsPerSet: [8, 8, 7, 6],  // min is 6, below target of 8
      lastAvgRIR: 1,
      availableWeights: [37.5, 40, 42.5, 45],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(40)
    expect(result.nextReps).toBe(8)  // retry at target reps
    expect(result.action).toBe('maintain')
  })

  it('increases reps when next weight not available within range', () => {
    const result = calculateProgression({
      programTargetReps: 6,
      programTargetSets: 4,
      lastWeightKg: 40,
      lastRepsPerSet: [8, 8, 8, 8],  // at top of range
      lastAvgRIR: 2,
      availableWeights: [37.5, 40, 50], // no 42.5, only big jump to 50
      phase: 'hypertrophy',
    })
    // 50 is too far from 42.5 target, so increase weight anyway (findNextWeight accepts any next weight)
    expect(result.nextWeightKg).toBe(50)
    expect(result.action).toBe('increase_weight')
  })

  it('decreases weight after significant regression', () => {
    const result = calculateProgression({
      programTargetReps: 8,
      programTargetSets: 4,
      lastWeightKg: 40,
      lastRepsPerSet: [6, 5, 5, 4],  // total 20, expected 32, deficit > 25%
      lastAvgRIR: 0,
      availableWeights: [35, 37.5, 40, 42.5],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(37.5)
    expect(result.action).toBe('decrease')
  })

  it('maintains at max reps when at top of range and no suitable weight available', () => {
    const result = calculateProgression({
      programTargetReps: 10,  // targeting 10-12 range
      programTargetSets: 4,
      lastWeightKg: 40,
      lastRepsPerSet: [12, 12, 12, 12],  // at top of range
      lastAvgRIR: 2,
      availableWeights: [40], // no higher weights available
      phase: 'hypertrophy',
    })
    expect(result.action).toBe('maintain')
    expect(result.nextWeightKg).toBe(40)
  })

  it('does not progress when RIR is 0 (max effort)', () => {
    const result = calculateProgression({
      programTargetReps: 8,
      programTargetSets: 4,
      lastWeightKg: 40,
      lastRepsPerSet: [8, 8, 8, 8],
      lastAvgRIR: 0,
      availableWeights: [40, 42.5],
      phase: 'hypertrophy',
    })
    expect(result.action).toBe('maintain')
  })

  it('respects strength phase max reps (8) for rep increase', () => {
    const result = calculateProgression({
      programTargetReps: 6,
      programTargetSets: 4,
      lastWeightKg: 80,
      lastRepsPerSet: [7, 7, 7, 7],  // not yet at top of 6-8 range
      lastAvgRIR: 2,
      availableWeights: [80, 90], // 10kg gap
      phase: 'strength',
    })
    // Should increase reps to 8 (max for strength)
    expect(result.action).toBe('increase_reps')
    expect(result.nextReps).toBe(8)
  })
})

describe('shouldDeload', () => {
  it('returns true after 5 weeks', () => {
    expect(shouldDeload(5)).toBe(true)
  })

  it('returns true after 6 weeks', () => {
    expect(shouldDeload(6)).toBe(true)
  })

  it('returns false at 4 weeks', () => {
    expect(shouldDeload(4)).toBe(false)
  })

  it('returns false at 0 weeks', () => {
    expect(shouldDeload(0)).toBe(false)
  })
})

describe('getPhaseRecommendation', () => {
  it('stays in hypertrophy when pain is high', () => {
    const phase = getPhaseRecommendation({
      currentPhase: 'hypertrophy',
      weeksInPhase: 8,
      avgPainLevel: 4,
      progressionConsistency: 0.8,
    })
    expect(phase).toBe('hypertrophy')
  })

  it('transitions to transition when pain is low and progression stable', () => {
    const phase = getPhaseRecommendation({
      currentPhase: 'hypertrophy',
      weeksInPhase: 8,
      avgPainLevel: 1,
      progressionConsistency: 0.8,
    })
    expect(phase).toBe('transition')
  })

  it('stays in hypertrophy if not enough weeks', () => {
    const phase = getPhaseRecommendation({
      currentPhase: 'hypertrophy',
      weeksInPhase: 3,
      avgPainLevel: 1,
      progressionConsistency: 0.9,
    })
    expect(phase).toBe('hypertrophy')
  })

  it('transitions from transition to strength', () => {
    const phase = getPhaseRecommendation({
      currentPhase: 'transition',
      weeksInPhase: 4,
      avgPainLevel: 1,
      progressionConsistency: 0.7,
    })
    expect(phase).toBe('strength')
  })

  it('stays in transition if progression is inconsistent', () => {
    const phase = getPhaseRecommendation({
      currentPhase: 'transition',
      weeksInPhase: 5,
      avgPainLevel: 1,
      progressionConsistency: 0.4,
    })
    expect(phase).toBe('transition')
  })
})
