import type { BodyZone, Exercise } from '../db/types'

/**
 * Selects filler exercises (rehab/mobility) that do NOT fatigue
 * the muscles needed for the upcoming main exercise.
 */
export function selectFillerExercises(
  upcomingPrimaryMuscles: string[],
  userConditions: BodyZone[],
  availableExercises: Exercise[]
): Exercise[] {
  const fillers = availableExercises.filter(ex =>
    ex.isRehab &&
    ex.rehabTarget &&
    userConditions.includes(ex.rehabTarget) &&
    !ex.primaryMuscles.some(m => upcomingPrimaryMuscles.includes(m))
  )

  return fillers.slice(0, 2) // max 2 filler exercises
}
