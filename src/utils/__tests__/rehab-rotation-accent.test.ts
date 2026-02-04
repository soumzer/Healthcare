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

  it('garantit au moins 2 exercices de la zone accentuee', () => {
    const result = selectRotatedExercisesWithAccent(allExercises, ['knee_right'], 5)
    expect(result).toHaveLength(5)

    const kneeExercises = result.filter(e =>
      e.exerciseName.startsWith('Knee')
    )
    expect(kneeExercises.length).toBeGreaterThanOrEqual(2)
  })

  it('remplit les slots restants avec des exercices normaux', () => {
    const result = selectRotatedExercisesWithAccent(allExercises, ['knee_right'], 5)
    expect(result).toHaveLength(5)

    const nonKnee = result.filter(e => !e.exerciseName.startsWith('Knee'))
    expect(nonKnee.length).toBeGreaterThan(0)
  })

  it('gere le cas ou le pool accent a moins de 2 exercices', () => {
    const smallInput = [
      makeInput('Knee exercise 1', 'Knee protocol', 'knee_right'),
      makeInput('Back exercise 1', 'Back protocol', 'lower_back'),
      makeInput('Back exercise 2', 'Back protocol', 'lower_back'),
      makeInput('Back exercise 3', 'Back protocol', 'lower_back'),
      makeInput('Elbow exercise 1', 'Elbow protocol', 'elbow_right'),
      makeInput('Elbow exercise 2', 'Elbow protocol', 'elbow_right'),
    ]

    const result = selectRotatedExercisesWithAccent(smallInput, ['knee_right'], 5)
    expect(result).toHaveLength(5)

    // Only 1 knee exercise available, should still include it
    const kneeExercises = result.filter(e => e.exerciseName.startsWith('Knee'))
    expect(kneeExercises.length).toBeGreaterThanOrEqual(1)
  })

  it('retourne tous les exercices si total <= maxCount', () => {
    const smallInput = [
      makeInput('Knee 1', 'Knee', 'knee_right'),
      makeInput('Back 1', 'Back', 'lower_back'),
      makeInput('Elbow 1', 'Elbow', 'elbow_right'),
    ]

    const result = selectRotatedExercisesWithAccent(smallInput, ['knee_right'], 5)
    expect(result).toHaveLength(3) // All of them, since 3 < 5
  })

  it('supporte plusieurs zones accent', () => {
    const result = selectRotatedExercisesWithAccent(
      allExercises,
      ['knee_right', 'elbow_right'],
      5,
    )
    expect(result).toHaveLength(5)

    // Should have exercises from both accent zones
    const accentExercises = result.filter(e =>
      e.exerciseName.startsWith('Knee') || e.exerciseName.startsWith('Elbow')
    )
    expect(accentExercises.length).toBeGreaterThanOrEqual(2)
  })

  it('ne depasse pas maxCount', () => {
    const result = selectRotatedExercisesWithAccent(allExercises, ['knee_right'], 3)
    expect(result).toHaveLength(3)
  })
})
