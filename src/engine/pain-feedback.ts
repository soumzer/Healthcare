import type { BodyZone } from '../db/types'

export interface PainFeedbackEntry {
  zone: BodyZone
  maxPainLevel: number // max pain reported in last 7 days for this zone
  duringExercises: string[] // exercise names where pain was reported during sets
}

export interface PainAdjustment {
  exerciseId: number
  exerciseName: string
  action: 'reduce_weight' | 'skip' | 'no_progression'
  reason: string
  weightMultiplier?: number // e.g., 0.8 for 20% reduction
  referenceWeightKg?: number // the "healthy" weight to reduce FROM (last weight when pain < 3)
}

/**
 * Given recent pain data and exercises in a session, determine adjustments.
 *
 * 4-tier pain model:
 * - 0-2 (OK):      no adjustment
 * - 3-4 (Gêne):    no_progression — weight stays the same, no increase
 * - 5-6 (Douleur): reduce_weight — 20% reduction based on REFERENCE weight
 * - 7-10 (Sévère): skip — exercise is skipped entirely
 *
 * Additional rule:
 * - Pain during a specific exercise (during_set) -> no_progression for that exercise
 *
 * Priority: skip > reduce_weight > no_progression
 * (if an exercise qualifies for multiple adjustments, the highest-priority one wins)
 *
 * @param referenceWeights - Map of exerciseId -> last "healthy" weight (when pain < 3).
 *   Used as the base for reduce_weight calculations instead of current prescribed weight,
 *   to avoid downward spirals from repeated reductions.
 */
export function calculatePainAdjustments(
  painFeedback: PainFeedbackEntry[],
  exercises: Array<{ exerciseId: number; exerciseName: string; contraindications: BodyZone[] }>,
  referenceWeights?: Map<number, number>,
): PainAdjustment[] {
  if (painFeedback.length === 0) return []

  const adjustments = new Map<number, PainAdjustment>()

  // Priority order: skip (highest) > reduce_weight > no_progression (lowest)
  const priorityOf = (action: PainAdjustment['action']): number => {
    switch (action) {
      case 'skip': return 3
      case 'reduce_weight': return 2
      case 'no_progression': return 1
    }
  }

  const setAdjustment = (adj: PainAdjustment) => {
    const existing = adjustments.get(adj.exerciseId)
    if (!existing || priorityOf(adj.action) > priorityOf(existing.action)) {
      adjustments.set(adj.exerciseId, adj)
    }
  }

  for (const entry of painFeedback) {
    // Tier 4 (Sévère): pain 7-10 -> skip exercises with that zone in contraindications
    if (entry.maxPainLevel >= 7) {
      for (const ex of exercises) {
        if (ex.contraindications.includes(entry.zone)) {
          setAdjustment({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            action: 'skip',
            reason: `Douleur severe (${entry.maxPainLevel}/10) sur ${entry.zone} — exercice deconseille`,
          })
        }
      }
    }
    // Tier 3 (Douleur): pain 5-6 -> reduce weight by 20% based on reference weight
    else if (entry.maxPainLevel >= 5) {
      for (const ex of exercises) {
        if (ex.contraindications.includes(entry.zone)) {
          const refWeight = referenceWeights?.get(ex.exerciseId)
          setAdjustment({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            action: 'reduce_weight',
            reason: `Douleur moderee (${entry.maxPainLevel}/10) sur ${entry.zone} — poids reduit de 20%`,
            weightMultiplier: 0.8,
            referenceWeightKg: refWeight,
          })
        }
      }
    }
    // Tier 2 (Gêne): pain 3-4 -> no_progression for exercises with that zone in contraindications
    else if (entry.maxPainLevel >= 3) {
      for (const ex of exercises) {
        if (ex.contraindications.includes(entry.zone)) {
          setAdjustment({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            action: 'no_progression',
            reason: `Gene (${entry.maxPainLevel}/10) sur ${entry.zone} — progression bloquee`,
          })
        }
      }
    }
    // Tier 1 (OK): pain 0-2 -> no adjustment from zone pain

    // Additional rule: pain during a specific exercise -> no_progression for that exercise
    for (const exerciseName of entry.duringExercises) {
      const matchingExercise = exercises.find((e) => e.exerciseName === exerciseName)
      if (matchingExercise) {
        setAdjustment({
          exerciseId: matchingExercise.exerciseId,
          exerciseName: matchingExercise.exerciseName,
          action: 'no_progression',
          reason: `Douleur signalee pendant cet exercice — pas de progression`,
        })
      }
    }
  }

  return Array.from(adjustments.values())
}
