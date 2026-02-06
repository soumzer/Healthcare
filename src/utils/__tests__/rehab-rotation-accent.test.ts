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

  it('5 exercices normaux + 2 extra sur zone skip (maxCount=7)', () => {
    const result = selectRotatedExercisesWithAccent(allExercises, ['knee_right'], 7)
    expect(result).toHaveLength(7)

    // First 5 are normal rotation (can include knee exercises)
    // Then +2 extra specifically from knee zone
    const kneeExercises = result.filter(e =>
      e.exercise.exerciseName.startsWith('Knee')
    )
    // Should have at least 2 knee exercises (the +2 extra)
    expect(kneeExercises.length).toBeGreaterThanOrEqual(2)
  })

  it('gere le cas ou le pool accent a moins de 2 exercices extra disponibles', () => {
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
    // 5 normal + up to 2 extra from knee (but only what's left after normal selection)
    expect(result.length).toBeLessThanOrEqual(7)
    expect(result.length).toBeGreaterThanOrEqual(5)
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

    // Should have +2 extra exercises from the accent zones (knee or elbow)
    // Plus whatever was selected in normal rotation
    const accentExercises = result.filter(e =>
      e.exercise.exerciseName.startsWith('Knee') || e.exercise.exerciseName.startsWith('Elbow')
    )
    expect(accentExercises.length).toBeGreaterThanOrEqual(2)
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
