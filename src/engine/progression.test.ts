import { describe, it, expect } from 'vitest'
import { calculateProgression, shouldDeload, getPhaseRecommendation } from './progression'

describe('calculateProgression', () => {
  it('increases weight when all sets completed with sufficient RIR', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 8, 8],
      avgRIR: 2,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights: [37.5, 40, 42.5, 45],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(42.5)
    expect(result.nextReps).toBe(8)
    expect(result.action).toBe('increase_weight')
  })

  it('keeps same weight when sets partially completed', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 7, 6],
      avgRIR: 1,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights: [37.5, 40, 42.5, 45],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(40)
    expect(result.nextReps).toBe(8)
    expect(result.action).toBe('maintain')
  })

  it('increases reps when next weight not available', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 8, 8],
      avgRIR: 2,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights: [37.5, 40, 45], // no 42.5
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(40)
    expect(result.nextReps).toBe(9)
    expect(result.action).toBe('increase_reps')
  })

  it('does not progress when rest was much longer than prescribed', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 8, 8],
      avgRIR: 2,
      avgRestSeconds: 300, // 5min instead of 2min
      prescribedRestSeconds: 120,
      availableWeights: [37.5, 40, 42.5],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(40)
    expect(result.action).toBe('maintain')
  })

  it('decreases weight after significant regression', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [6, 5, 5, 4],
      avgRIR: 0,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights: [35, 37.5, 40, 42.5],
      phase: 'hypertrophy',
    })
    expect(result.nextWeightKg).toBe(37.5)
    expect(result.action).toBe('decrease')
  })

  it('maintains at max reps when weight jump too big and reps maxed', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 15, // already at max hypertrophy reps
      prescribedSets: 4,
      actualReps: [15, 15, 15, 15],
      avgRIR: 2,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights: [40, 50], // jump is 10kg — too big
      phase: 'hypertrophy',
    })
    expect(result.action).toBe('maintain')
  })

  it('does not progress when RIR is 0 (max effort)', () => {
    const result = calculateProgression({
      prescribedWeightKg: 40,
      prescribedReps: 8,
      prescribedSets: 4,
      actualReps: [8, 8, 8, 8],
      avgRIR: 0,
      avgRestSeconds: 120,
      prescribedRestSeconds: 120,
      availableWeights: [40, 42.5],
      phase: 'hypertrophy',
    })
    expect(result.action).toBe('maintain')
  })

  it('respects strength phase max reps (8) for rep increase', () => {
    const result = calculateProgression({
      prescribedWeightKg: 80,
      prescribedReps: 8, // at max for strength
      prescribedSets: 4,
      actualReps: [8, 8, 8, 8],
      avgRIR: 2,
      avgRestSeconds: 180,
      prescribedRestSeconds: 180,
      availableWeights: [80, 90], // 10kg gap
      phase: 'strength',
    })
    expect(result.action).toBe('maintain') // can't increase reps (at 8 max) or weight (jump too big)
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
