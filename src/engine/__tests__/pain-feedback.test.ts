import { describe, it, expect } from 'vitest'
import { calculatePainAdjustments, type PainFeedbackEntry } from '../pain-feedback'
import type { BodyZone } from '../../db/types'

const makeExercise = (
  exerciseId: number,
  exerciseName: string,
  contraindications: BodyZone[] = [],
) => ({
  exerciseId,
  exerciseName,
  contraindications,
})

describe('calculatePainAdjustments', () => {
  it('returns reduce_weight (0.8 multiplier) when pain is 5 on a contraindicated zone', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 5, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Back squat barre', ['lower_back', 'knee_left']),
      makeExercise(2, 'Curl biceps', []),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0]).toEqual({
      exerciseId: 1,
      exerciseName: 'Back squat barre',
      action: 'reduce_weight',
      reason: expect.stringContaining('5/10'),
      weightMultiplier: 0.8,
    })
  })

  it('returns skip when pain is 7 on a contraindicated zone', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 7, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Back squat barre', ['lower_back', 'knee_left']),
      makeExercise(2, 'Curl biceps', []),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0]).toEqual({
      exerciseId: 1,
      exerciseName: 'Back squat barre',
      action: 'skip',
      reason: expect.stringContaining('7/10'),
    })
  })

  it('returns no_progression when pain was reported during a specific exercise', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'knee_left', maxPainLevel: 3, duringExercises: ['Leg press'] },
    ]
    const exercises = [
      makeExercise(1, 'Leg press', ['knee_left']),
      makeExercise(2, 'Curl biceps', []),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0]).toEqual({
      exerciseId: 1,
      exerciseName: 'Leg press',
      action: 'no_progression',
      reason: expect.stringContaining('pas de progression'),
    })
  })

  it('returns empty adjustments when no pain reported', () => {
    const feedback: PainFeedbackEntry[] = []
    const exercises = [
      makeExercise(1, 'Back squat barre', ['lower_back']),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toEqual([])
  })

  it('returns empty adjustments when pain zone has no matching exercises', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'ankle_left', maxPainLevel: 8, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Developpe couche barre', ['shoulder_left', 'shoulder_right']),
      makeExercise(2, 'Curl biceps', []),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toEqual([])
  })

  it('handles multiple zones with pain — adjustments stack correctly', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 5, duringExercises: [] },
      { zone: 'knee_left', maxPainLevel: 7, duringExercises: ['Leg press'] },
    ]
    const exercises = [
      makeExercise(1, 'Back squat barre', ['lower_back', 'knee_left']),
      makeExercise(2, 'Leg press', ['knee_left']),
      makeExercise(3, 'Curl biceps', []),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    // Back squat: lower_back pain=5 -> reduce_weight, knee_left pain=7 -> skip
    // skip has higher priority
    const squatAdj = adjustments.find((a) => a.exerciseId === 1)
    expect(squatAdj).toBeDefined()
    expect(squatAdj!.action).toBe('skip')

    // Leg press: knee_left pain=7 -> skip (overrides no_progression from during_set)
    const legPressAdj = adjustments.find((a) => a.exerciseId === 2)
    expect(legPressAdj).toBeDefined()
    expect(legPressAdj!.action).toBe('skip')

    // Curl: no adjustment
    const curlAdj = adjustments.find((a) => a.exerciseId === 3)
    expect(curlAdj).toBeUndefined()

    expect(adjustments).toHaveLength(2)
  })

  it('skip overrides reduce_weight for same exercise when both zones apply', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'shoulder_left', maxPainLevel: 5, duringExercises: [] },
      { zone: 'shoulder_right', maxPainLevel: 8, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Developpe couche barre', ['shoulder_left', 'shoulder_right']),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].action).toBe('skip')
  })

  it('reduce_weight overrides no_progression for same exercise', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 6, duringExercises: ['Back squat barre'] },
    ]
    const exercises = [
      makeExercise(1, 'Back squat barre', ['lower_back']),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toHaveLength(1)
    // reduce_weight (from pain >= 5 on contraindicated zone) has higher priority
    // than no_progression (from during_set pain)
    expect(adjustments[0].action).toBe('reduce_weight')
    expect(adjustments[0].weightMultiplier).toBe(0.8)
  })

  it('pain level 6 triggers reduce_weight (between 5 and 7)', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 6, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Soulevé de terre roumain', ['lower_back']),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].action).toBe('reduce_weight')
    expect(adjustments[0].weightMultiplier).toBe(0.8)
  })

  it('pain level 4 does not trigger reduce_weight or skip (below threshold)', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 4, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Back squat barre', ['lower_back']),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toEqual([])
  })

  it('pain level 10 triggers skip', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'knee_right', maxPainLevel: 10, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Back squat barre', ['knee_right']),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].action).toBe('skip')
  })

  it('during_set pain with no matching exercise name produces no adjustment', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'knee_left', maxPainLevel: 2, duringExercises: ['Nonexistent exercise'] },
    ]
    const exercises = [
      makeExercise(1, 'Back squat barre', ['knee_left']),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toEqual([])
  })
})
