import { describe, it, expect, beforeEach } from 'vitest'
import { selectRotatedExercisesWithAccent } from '../rehab-rotation'
import type { RehabExercise } from '../../data/rehab-protocols'
import type { BodyZone } from '../../db/types'

function makeRehabExercise(name: string): RehabExercise {
  return {
    exerciseName: name,
    sets: 3,
    reps: '10',
    intensity: 'light',
    notes: `Notes for ${name}`,
    placement: 'rest_day',
  }
}

function makeInput(name: string, protocolName: string, targetZone: BodyZone) {
  return {
    exercise: makeRehabExercise(name),
    protocolName,
    targetZone,
  }
}

// Clear localStorage before each test to avoid rotation state leaking
beforeEach(() => {
  localStorage.clear()
})

describe('selectRotatedExercisesWithAccent', () => {
  const allExercises = [
    makeInput('Knee exercise 1', 'Knee protocol', 'knee_right'),
    makeInput('Knee exercise 2', 'Knee protocol', 'knee_right'),
    makeInput('Knee exercise 3', 'Knee protocol', 'knee_right'),
    makeInput('Knee exercise 4', 'Knee protocol', 'knee_right'),
    makeInput('Knee exercise 5', 'Knee protocol', 'knee_right'),
    makeInput('Back exercise 1', 'Back protocol', 'lower_back'),
    makeInput('Back exercise 2', 'Back protocol', 'lower_back'),
    makeInput('Back exercise 3', 'Back protocol', 'lower_back'),
    makeInput('Elbow exercise 1', 'Elbow protocol', 'elbow_right'),
    makeInput('Elbow exercise 2', 'Elbow protocol', 'elbow_right'),
    makeInput('Shoulder exercise 1', 'Shoulder protocol', 'shoulder_left'),
    makeInput('Shoulder exercise 2', 'Shoulder protocol', 'shoulder_left'),
  ]

  it('fallback sur rotation normale si pas de zones accent', () => {
    const result = selectRotatedExercisesWithAccent(allExercises, [], 5)
    expect(result).toHaveLength(5)
  })

  it('garantit 4 exercices de la zone accentuee + 3 autres conditions (maxCount=7)', () => {
    const result = selectRotatedExercisesWithAccent(allExercises, ['knee_right'], 7)
    expect(result).toHaveLength(7)

    const kneeExercises = result.filter(e =>
      e.exercise.exerciseName.startsWith('Knee')
    )
    // Should have 4 knee exercises (ACCENT_GUARANTEED_SLOTS)
    expect(kneeExercises.length).toBe(4)

    // Should have 3 other exercises
    const nonKnee = result.filter(e => !e.exercise.exerciseName.startsWith('Knee'))
    expect(nonKnee.length).toBe(3)
  })

  it('gere le cas ou le pool accent a moins de 4 exercices', () => {
    const smallInput = [
      makeInput('Knee exercise 1', 'Knee protocol', 'knee_right'),
      makeInput('Knee exercise 2', 'Knee protocol', 'knee_right'),
      makeInput('Back exercise 1', 'Back protocol', 'lower_back'),
      makeInput('Back exercise 2', 'Back protocol', 'lower_back'),
      makeInput('Back exercise 3', 'Back protocol', 'lower_back'),
      makeInput('Elbow exercise 1', 'Elbow protocol', 'elbow_right'),
      makeInput('Elbow exercise 2', 'Elbow protocol', 'elbow_right'),
    ]

    const result = selectRotatedExercisesWithAccent(smallInput, ['knee_right'], 7)
    expect(result).toHaveLength(7)

    // Only 2 knee exercises available, should include both
    const kneeExercises = result.filter(e => e.exercise.exerciseName.startsWith('Knee'))
    expect(kneeExercises.length).toBe(2)

    // Should backfill with more normal exercises
    const nonKnee = result.filter(e => !e.exercise.exerciseName.startsWith('Knee'))
    expect(nonKnee.length).toBe(5)
  })

  it('retourne tous les exercices si total <= maxCount', () => {
    const smallInput = [
      makeInput('Knee 1', 'Knee', 'knee_right'),
      makeInput('Back 1', 'Back', 'lower_back'),
      makeInput('Elbow 1', 'Elbow', 'elbow_right'),
    ]

    const result = selectRotatedExercisesWithAccent(smallInput, ['knee_right'], 7)
    expect(result).toHaveLength(3) // All of them, since 3 < 7
  })

  it('supporte plusieurs zones accent', () => {
    const result = selectRotatedExercisesWithAccent(
      allExercises,
      ['knee_right', 'elbow_right'],
      7,
    )
    expect(result).toHaveLength(7)

    // Should have exercises from both accent zones (up to 4 total for accent)
    const accentExercises = result.filter(e =>
      e.exercise.exerciseName.startsWith('Knee') || e.exercise.exerciseName.startsWith('Elbow')
    )
    expect(accentExercises.length).toBe(4)
  })

  it('ne depasse pas maxCount', () => {
    const result = selectRotatedExercisesWithAccent(allExercises, ['knee_right'], 7)
    expect(result.length).toBeLessThanOrEqual(7)
  })

  it('avec maxCount=5 (mode normal), respecte la limite', () => {
    const result = selectRotatedExercisesWithAccent(allExercises, [], 5)
    expect(result).toHaveLength(5)
  })
})
