import type { Exercise } from '../db/types'

/**
 * Selects 2-3 cooldown/mobility exercises from the catalog
 * based on muscles worked during the session.
 */
export function selectCooldownExercises(
  sessionMuscles: string[],
  exerciseCatalog: Exercise[],
  maxCount: number = 3,
): Exercise[] {
  if (sessionMuscles.length === 0) return []

  const sessionMusclesLower = new Set(sessionMuscles.map(m => m.toLowerCase()))

  // Find mobility exercises that overlap with session muscles
  const candidates = exerciseCatalog.filter(ex =>
    (ex.category === 'mobility' || (ex.tags?.includes('cooldown'))) &&
    ex.primaryMuscles.some(m => sessionMusclesLower.has(m.toLowerCase()))
  )

  // If not enough specific matches, add general mobility exercises
  if (candidates.length < maxCount) {
    const generalMobility = exerciseCatalog.filter(ex =>
      ex.category === 'mobility' &&
      !candidates.includes(ex)
    )
    candidates.push(...generalMobility)
  }

  return candidates.slice(0, maxCount)
}
