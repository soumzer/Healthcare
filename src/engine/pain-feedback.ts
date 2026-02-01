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
}

/**
 * Given recent pain data and exercises in a session, determine adjustments.
 *
 * Rules:
 * - If pain >= 7 reported for a zone, exercises with that zone in contraindications
 *   are marked for skip (suggest alternative)
 * - If pain >= 5 reported for a zone, exercises with that zone in contraindications
 *   get weight reduced by 20%
 * - If pain was reported during a specific exercise (context 'during_set'),
 *   that exercise gets no_progression (maintain current weight)
 *
 * Priority: skip > reduce_weight > no_progression
 * (if an exercise qualifies for multiple adjustments, the highest-priority one wins)
 */
export function calculatePainAdjustments(
  painFeedback: PainFeedbackEntry[],
  exercises: Array<{ exerciseId: number; exerciseName: string; contraindications: BodyZone[] }>,
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
    // Rule 1: pain >= 7 -> skip exercises with that zone in contraindications
    if (entry.maxPainLevel >= 7) {
      for (const ex of exercises) {
        if (ex.contraindications.includes(entry.zone)) {
          setAdjustment({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            action: 'skip',
            reason: `Douleur elevee (${entry.maxPainLevel}/10) sur ${entry.zone} — exercice deconseille`,
          })
        }
      }
    }
    // Rule 2: pain >= 5 (and < 7 effectively, due to priority) -> reduce weight by 20%
    else if (entry.maxPainLevel >= 5) {
      for (const ex of exercises) {
        if (ex.contraindications.includes(entry.zone)) {
          setAdjustment({
            exerciseId: ex.exerciseId,
            exerciseName: ex.exerciseName,
            action: 'reduce_weight',
            reason: `Douleur moderee (${entry.maxPainLevel}/10) sur ${entry.zone} — poids reduit de 20%`,
            weightMultiplier: 0.8,
          })
        }
      }
    }

    // Rule 3: pain during a specific exercise -> no_progression for that exercise
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
