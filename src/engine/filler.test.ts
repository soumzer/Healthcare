import { describe, it, expect } from 'vitest'
import { selectFillerExercises } from './filler'
import type { Exercise } from '../db/types'

describe('selectFillerExercises', () => {
  const mockExercises: Exercise[] = [
    {
      id: 1, name: 'Tyler Twist', category: 'rehab',
      primaryMuscles: ['forearm_flexors'], secondaryMuscles: [],
      equipmentNeeded: ['flexbar'], contraindications: [],
      alternatives: [], instructions: '', isRehab: true,
      rehabTarget: 'elbow_right', tags: ['rehab'],
    },
    {
      id: 2, name: 'Nerve flossing', category: 'rehab',
      primaryMuscles: ['sciatic_nerve'], secondaryMuscles: [],
      equipmentNeeded: [], contraindications: [],
      alternatives: [], instructions: '', isRehab: true,
      rehabTarget: 'lower_back', tags: ['rehab'],
    },
    {
      id: 3, name: 'Bench Press', category: 'compound',
      primaryMuscles: ['chest', 'triceps'], secondaryMuscles: ['front_delt'],
      equipmentNeeded: ['bench', 'barbell'], contraindications: [],
      alternatives: [], instructions: '', isRehab: false,
      tags: ['push'],
    },
  ]

  it('returns rehab exercises matching user conditions', () => {
    const fillers = selectFillerExercises(
      ['chest', 'triceps'],
      ['elbow_right', 'lower_back'],
      mockExercises
    )
    expect(fillers.length).toBeGreaterThan(0)
    expect(fillers.every(f => f.isRehab)).toBe(true)
  })

  it('excludes exercises that fatigue upcoming muscles', () => {
    const fillers = selectFillerExercises(
      ['forearm_flexors'], // next exercise uses forearm
      ['elbow_right'],
      mockExercises
    )
    // Tyler Twist targets forearm_flexors, should be excluded
    expect(fillers.find(f => f.name === 'Tyler Twist')).toBeUndefined()
  })

  it('returns max 2 filler exercises', () => {
    const fillers = selectFillerExercises(
      ['chest'],
      ['elbow_right', 'lower_back', 'knee_right'],
      mockExercises
    )
    expect(fillers.length).toBeLessThanOrEqual(2)
  })

  it('returns empty if no conditions match', () => {
    const fillers = selectFillerExercises(
      ['chest'],
      ['ankle_left'], // no rehab exercise targets this
      mockExercises
    )
    expect(fillers).toHaveLength(0)
  })
})
