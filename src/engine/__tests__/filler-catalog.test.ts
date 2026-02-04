import { describe, it, expect } from 'vitest'
import { suggestFillerFromCatalog } from '../filler'
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
    instructions: `Instructions for ${name}`,
    isRehab: false,
    tags,
  }
}

const catalog: Exercise[] = [
  makeExercise('Etirement quadriceps', 'mobility', ['quadriceps'], ['mobility']),
  makeExercise('Etirement pectoraux', 'mobility', ['pectoraux'], ['mobility']),
  makeExercise('Foam roll dos', 'mobility', ['dorsaux'], ['cooldown']),
  makeExercise('Cooldown core', 'core', ['core'], ['cooldown']),
  makeExercise('Squat', 'compound', ['quadriceps', 'fessiers'], []),
  makeExercise('Curl biceps', 'isolation', ['biceps'], []),
]

describe('suggestFillerFromCatalog', () => {
  it('retourne des exercices mobility/cooldown du catalogue', () => {
    const result = suggestFillerFromCatalog({
      sessionMuscles: ['biceps'],
      completedFillers: [],
      exerciseCatalog: catalog,
    })
    expect(result.length).toBeGreaterThan(0)
    // Should not include compound or isolation
    for (const suggestion of result) {
      expect(['Squat', 'Curl biceps']).not.toContain(suggestion.name)
    }
  })

  it('exclut les exercices deja completes', () => {
    const result = suggestFillerFromCatalog({
      sessionMuscles: ['biceps'],
      completedFillers: ['Etirement quadriceps', 'Etirement pectoraux'],
      exerciseCatalog: catalog,
    })
    const names = result.map(s => s.name)
    expect(names).not.toContain('Etirement quadriceps')
    expect(names).not.toContain('Etirement pectoraux')
  })

  it('evite les conflits musculaires avec les muscles de la session', () => {
    const result = suggestFillerFromCatalog({
      sessionMuscles: ['quadriceps'],
      completedFillers: [],
      exerciseCatalog: catalog,
    })
    const names = result.map(s => s.name)
    // Quadriceps is lower body, so lower body mobility should be excluded
    // but core and upper body should be included
    expect(names).not.toContain('Etirement quadriceps')
  })

  it('respecte le parametre count', () => {
    const result = suggestFillerFromCatalog({
      sessionMuscles: ['biceps'],
      completedFillers: [],
      exerciseCatalog: catalog,
      count: 1,
    })
    expect(result.length).toBeLessThanOrEqual(1)
  })

  it('retourne un tableau vide si aucun candidat', () => {
    const result = suggestFillerFromCatalog({
      sessionMuscles: ['biceps'],
      completedFillers: [],
      exerciseCatalog: [], // empty catalog
    })
    expect(result).toEqual([])
  })

  it('retourne max 3 par defaut', () => {
    const bigCatalog = Array.from({ length: 10 }, (_, i) =>
      makeExercise(`Mob ${i}`, 'mobility', ['core'], ['mobility'])
    )
    const result = suggestFillerFromCatalog({
      sessionMuscles: ['biceps'],
      completedFillers: [],
      exerciseCatalog: bigCatalog,
    })
    expect(result).toHaveLength(3)
  })

  it('chaque suggestion a les champs requis', () => {
    const result = suggestFillerFromCatalog({
      sessionMuscles: ['biceps'],
      completedFillers: [],
      exerciseCatalog: catalog,
    })
    for (const s of result) {
      expect(s).toHaveProperty('name')
      expect(s).toHaveProperty('sets')
      expect(s).toHaveProperty('reps')
      expect(s).toHaveProperty('duration')
      expect(s).toHaveProperty('isRehab')
      expect(s.isRehab).toBe(false)
    }
  })

  it('inclut les exercices tagges cooldown meme si pas categorie mobility', () => {
    const result = suggestFillerFromCatalog({
      sessionMuscles: ['biceps'],
      completedFillers: [],
      exerciseCatalog: catalog,
    })
    const names = result.map(s => s.name)
    expect(names).toContain('Cooldown core')
  })
})
