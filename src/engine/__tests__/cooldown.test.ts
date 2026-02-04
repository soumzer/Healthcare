import { describe, it, expect } from 'vitest'
import { selectCooldownExercises } from '../cooldown'
import type { Exercise } from '../../db/types'

function makeExercise(
  name: string,
  category: Exercise['category'],
  primaryMuscles: string[],
  tags: string[] = [],
): Exercise {
  return {
    id: Math.floor(Math.random() * 10000),
    name,
    category,
    primaryMuscles,
    secondaryMuscles: [],
    equipmentNeeded: [],
    contraindications: [],
    alternatives: [],
    instructions: '',
    isRehab: false,
    tags,
  }
}

describe('selectCooldownExercises', () => {
  const catalog: Exercise[] = [
    makeExercise('Etirement quadriceps', 'mobility', ['quadriceps']),
    makeExercise('Etirement ischio', 'mobility', ['ischio-jambiers']),
    makeExercise('Etirement pectoraux', 'mobility', ['pectoraux']),
    makeExercise('Foam roll dos', 'mobility', ['dorsaux']),
    makeExercise('Squat', 'compound', ['quadriceps', 'fessiers']),
    makeExercise('Bench press', 'compound', ['pectoraux', 'triceps']),
    makeExercise('Stretch cooldown', 'core', ['core'], ['cooldown']),
  ]

  it('retourne un tableau vide si sessionMuscles est vide', () => {
    const result = selectCooldownExercises([], catalog)
    expect(result).toEqual([])
  })

  it('selectionne les exercices mobility qui matchent les muscles de la session', () => {
    const result = selectCooldownExercises(['quadriceps', 'ischio-jambiers'], catalog)
    const names = result.map(e => e.name)
    expect(names).toContain('Etirement quadriceps')
    expect(names).toContain('Etirement ischio')
  })

  it('inclut les exercices tagges cooldown meme si pas mobility', () => {
    const result = selectCooldownExercises(['core'], catalog)
    const names = result.map(e => e.name)
    expect(names).toContain('Stretch cooldown')
  })

  it('n\'inclut pas les exercices compound meme si les muscles matchent', () => {
    const result = selectCooldownExercises(['quadriceps', 'pectoraux'], catalog)
    const names = result.map(e => e.name)
    expect(names).not.toContain('Squat')
    expect(names).not.toContain('Bench press')
  })

  it('respecte le maxCount', () => {
    const result = selectCooldownExercises(['quadriceps', 'ischio-jambiers', 'pectoraux'], catalog, 2)
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it('ajoute de la mobilite generale si pas assez de matches specifiques', () => {
    // Only one muscle matches specifically
    const result = selectCooldownExercises(['quadriceps'], catalog, 3)
    expect(result.length).toBe(3)
    // First should be the specific match, rest filled from general mobility
  })

  it('match est case-insensitive', () => {
    const result = selectCooldownExercises(['Quadriceps'], catalog)
    const names = result.map(e => e.name)
    expect(names).toContain('Etirement quadriceps')
  })

  it('retourne maxCount=3 par defaut', () => {
    const bigCatalog = [
      makeExercise('Mob 1', 'mobility', ['quadriceps']),
      makeExercise('Mob 2', 'mobility', ['quadriceps']),
      makeExercise('Mob 3', 'mobility', ['quadriceps']),
      makeExercise('Mob 4', 'mobility', ['quadriceps']),
      makeExercise('Mob 5', 'mobility', ['quadriceps']),
    ]
    const result = selectCooldownExercises(['quadriceps'], bigCatalog)
    expect(result).toHaveLength(3)
  })
})
