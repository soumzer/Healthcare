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
  // === Tier 1 (OK): pain 0-2 — no adjustment ===

  it('returns no adjustment when pain is 0', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 0, duringExercises: [] },
    ]
    const exercises = [makeExercise(1, 'Back squat barre', ['lower_back'])]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toEqual([])
  })

  it('returns no adjustment when pain is 1', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 1, duringExercises: [] },
    ]
    const exercises = [makeExercise(1, 'Back squat barre', ['lower_back'])]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toEqual([])
  })

  it('returns no adjustment when pain is 2', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 2, duringExercises: [] },
    ]
    const exercises = [makeExercise(1, 'Back squat barre', ['lower_back'])]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toEqual([])
  })

  // === Tier 2 (Gêne): pain 3-4 — no_progression ===

  it('returns no_progression when pain is 3 on a contraindicated zone', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 3, duringExercises: [] },
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
      action: 'no_progression',
      reason: expect.stringContaining('3/10'),
    })
  })

  it('returns no_progression when pain is 4 on a contraindicated zone', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 4, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Back squat barre', ['lower_back']),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0]).toEqual({
      exerciseId: 1,
      exerciseName: 'Back squat barre',
      action: 'no_progression',
      reason: expect.stringContaining('4/10'),
    })
  })

  // === Tier 3 (Douleur): pain 5-6 — reduce_weight ===

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
      referenceWeightKg: undefined,
    })
  })

  it('returns reduce_weight with referenceWeightKg when available in map', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 5, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Back squat barre', ['lower_back']),
    ]
    const referenceWeights = new Map<number, number>([[1, 80]])

    const adjustments = calculatePainAdjustments(feedback, exercises, referenceWeights)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].action).toBe('reduce_weight')
    expect(adjustments[0].referenceWeightKg).toBe(80)
    expect(adjustments[0].weightMultiplier).toBe(0.8)
  })

  it('returns reduce_weight without referenceWeightKg when exercise not in map', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 5, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Back squat barre', ['lower_back']),
    ]
    const referenceWeights = new Map<number, number>([[99, 50]]) // different exercise

    const adjustments = calculatePainAdjustments(feedback, exercises, referenceWeights)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].action).toBe('reduce_weight')
    expect(adjustments[0].referenceWeightKg).toBeUndefined()
  })

  it('pain level 6 triggers reduce_weight', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 6, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Souleve de terre roumain', ['lower_back']),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].action).toBe('reduce_weight')
    expect(adjustments[0].weightMultiplier).toBe(0.8)
  })

  // === Tier 4 (Sévère): pain 7-10 — skip ===

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

  it('pain level 8 triggers skip', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'knee_right', maxPainLevel: 8, duringExercises: [] },
    ]
    const exercises = [makeExercise(1, 'Back squat barre', ['knee_right'])]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].action).toBe('skip')
  })

  it('pain level 9 triggers skip', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'knee_right', maxPainLevel: 9, duringExercises: [] },
    ]
    const exercises = [makeExercise(1, 'Back squat barre', ['knee_right'])]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].action).toBe('skip')
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

  // === During-set pain ===

  it('returns no_progression when pain was reported during a specific exercise', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'knee_left', maxPainLevel: 3, duringExercises: ['Leg press'] },
    ]
    const exercises = [
      makeExercise(1, 'Leg press', ['knee_left']),
      makeExercise(2, 'Curl biceps', []),
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    // Both zone pain (3 -> no_progression) and during_set -> no_progression apply
    expect(adjustments).toHaveLength(1)
    expect(adjustments[0].exerciseId).toBe(1)
    expect(adjustments[0].action).toBe('no_progression')
  })

  // === Edge cases ===

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

  // === Priority / stacking tests ===

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
    // reduce_weight (from pain 6 on contraindicated zone) has higher priority
    // than no_progression (from during_set pain)
    expect(adjustments[0].action).toBe('reduce_weight')
    expect(adjustments[0].weightMultiplier).toBe(0.8)
  })

  it('pain 3 on zone A and pain 6 on zone B gives correct per-zone adjustments', () => {
    const feedback: PainFeedbackEntry[] = [
      { zone: 'lower_back', maxPainLevel: 3, duringExercises: [] },
      { zone: 'knee_left', maxPainLevel: 6, duringExercises: [] },
    ]
    const exercises = [
      makeExercise(1, 'Back squat barre', ['lower_back']),       // lower_back pain=3 -> no_progression
      makeExercise(2, 'Leg press', ['knee_left']),                // knee_left pain=6 -> reduce_weight
      makeExercise(3, 'Fentes', ['lower_back', 'knee_left']),    // both zones -> reduce_weight wins (higher priority)
      makeExercise(4, 'Curl biceps', []),                         // no contraindication -> no adjustment
    ]

    const adjustments = calculatePainAdjustments(feedback, exercises)

    const squatAdj = adjustments.find((a) => a.exerciseId === 1)
    expect(squatAdj).toBeDefined()
    expect(squatAdj!.action).toBe('no_progression')

    const legPressAdj = adjustments.find((a) => a.exerciseId === 2)
    expect(legPressAdj).toBeDefined()
    expect(legPressAdj!.action).toBe('reduce_weight')

    const fentesAdj = adjustments.find((a) => a.exerciseId === 3)
    expect(fentesAdj).toBeDefined()
    expect(fentesAdj!.action).toBe('reduce_weight')

    const curlAdj = adjustments.find((a) => a.exerciseId === 4)
    expect(curlAdj).toBeUndefined()

    expect(adjustments).toHaveLength(3)
  })
})
