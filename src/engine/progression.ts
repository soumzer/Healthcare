/**
 * Progression Engine - Simple, Predictable Cycle
 *
 * The cycle is:
 *   START: weight x target reps @2RIR
 *   → If successful with good RIR: +1 rep
 *   → If reached top of rep range: +weight, reset to target reps
 *   → If failed: retry same weight/reps
 *   → After repeated failures: deload (-10% weight)
 */

export interface ProgressionInput {
  /** Target reps from the PROGRAM (not from history) */
  programTargetReps: number
  /** Target sets from the PROGRAM */
  programTargetSets: number
  /** The weight used in the last session */
  lastWeightKg: number
  /** Actual reps performed per set, e.g., [8, 8, 8, 7] */
  lastRepsPerSet: number[]
  /** Average RIR (reps in reserve) from last session */
  lastAvgRIR: number
  /** Available weights at the gym */
  availableWeights: number[]
  /** Training phase */
  phase: 'hypertrophy' | 'strength' | 'deload'
  /** Session intensity override for DUP (daily undulating periodization) */
  sessionIntensity?: 'heavy' | 'moderate' | 'volume'
  /** Exercise category for determining weight increment */
  exerciseCategory?: 'compound' | 'isolation' | 'rehab' | 'mobility' | 'core'
}

export interface ProgressionResult {
  nextWeightKg: number
  nextReps: number
  action: 'increase_weight' | 'increase_reps' | 'maintain' | 'decrease'
  reason: string
}

/**
 * Calculate the next weight and reps based on last session performance.
 *
 * Uses ONLY program target reps, NOT historical prescribed reps.
 * This prevents the "prescribedReps pollution" bug.
 */
export function calculateProgression(input: ProgressionInput): ProgressionResult {
  const {
    programTargetReps,
    lastWeightKg,
    lastRepsPerSet,
    lastAvgRIR,
    availableWeights,
    phase,
    sessionIntensity,
    exerciseCategory,
  } = input

  // Early return if no previous session data
  if (!lastRepsPerSet || lastRepsPerSet.length === 0) {
    return {
      nextWeightKg: lastWeightKg,
      nextReps: programTargetReps,
      action: 'maintain',
      reason: 'Pas de données de série précédente',
    }
  }

  // Calculate rep statistics
  const avgReps = lastRepsPerSet.length > 0
    ? lastRepsPerSet.reduce((a, b) => a + b, 0) / lastRepsPerSet.length
    : programTargetReps
  const minReps = lastRepsPerSet.length > 0
    ? Math.min(...lastRepsPerSet)
    : programTargetReps

  // Determine rep range based on phase/intensity
  // Heavy/strength: 6-8 range, Volume/hypertrophy: 8-12 range
  const intensity = sessionIntensity
  const maxRepsInRange = intensity === 'heavy' ? 8
    : intensity === 'volume' ? 12
    : (phase === 'strength' ? 8 : 12)

  // Success criteria
  const completedTarget = minReps >= programTargetReps
  const hadGoodRIR = lastAvgRIR >= 2
  const hadModerateRIR = lastAvgRIR >= 1
  const reachedTopOfRange = avgReps >= programTargetReps + 2 // e.g., 8+ for a 6-8 range

  // CASE 1: Regression - couldn't complete even close to target reps
  // Total actual reps is less than 75% of what was expected
  const totalExpected = input.programTargetSets * programTargetReps
  const totalActual = lastRepsPerSet.reduce((a, b) => a + b, 0)
  // Guard against division by zero
  const repDeficit = totalExpected > 0 ? 1 - totalActual / totalExpected : 0

  if (repDeficit > 0.25) {
    // Significant regression - decrease weight
    const lowerWeight = availableWeights
      .filter(w => w < lastWeightKg)
      .sort((a, b) => b - a)[0] // highest weight below current
    return {
      nextWeightKg: lowerWeight ?? lastWeightKg,
      nextReps: programTargetReps,
      action: 'decrease',
      reason: 'Regression significative — on baisse la charge pour relancer',
    }
  }

  // CASE 2: Successful AND reached top of rep range - increase weight
  if (completedTarget && hadGoodRIR && reachedTopOfRange) {
    const nextWeight = findNextWeight(lastWeightKg, availableWeights, exerciseCategory)
    if (nextWeight > lastWeightKg) {
      return {
        nextWeightKg: nextWeight,
        nextReps: programTargetReps,
        action: 'increase_weight',
        reason: `Progression — on passe a ${nextWeight}kg`,
      }
    }
    // No higher weight available, stay at current
    return {
      nextWeightKg: lastWeightKg,
      nextReps: Math.round(avgReps),
      action: 'maintain',
      reason: 'Plafond de reps atteint — progression bloquee sans poids supplementaire',
    }
  }

  // CASE 3: Successful but not at top of range - increase reps
  if (completedTarget && hadGoodRIR) {
    const nextReps = Math.min(Math.round(avgReps) + 1, maxRepsInRange)
    if (nextReps > Math.round(avgReps)) {
      return {
        nextWeightKg: lastWeightKg,
        nextReps,
        action: 'increase_reps',
        reason: 'Bonne performance — on ajoute une rep',
      }
    }
    // Already at max reps in range
    return {
      nextWeightKg: lastWeightKg,
      nextReps: Math.round(avgReps),
      action: 'maintain',
      reason: 'Plafond de reps atteint — progression bloquee sans poids supplementaire',
    }
  }

  // CASE 4: Moderate effort (RIR 1-2) but completed - small progression
  if (completedTarget && hadModerateRIR) {
    const nextReps = Math.min(Math.round(avgReps) + 1, maxRepsInRange)
    return {
      nextWeightKg: lastWeightKg,
      nextReps,
      action: 'increase_reps',
      reason: 'Effort modere — on ajoute une rep prudemment',
    }
  }

  // CASE 5: Failed (couldn't complete reps OR RIR < 1) - retry same weight/reps
  return {
    nextWeightKg: lastWeightKg,
    nextReps: programTargetReps,
    action: 'maintain',
    reason: 'Series incompletes ou effort maximal — on maintient pour consolider',
  }
}

/**
 * Find the next available weight increment.
 * Uses different increments based on exercise type:
 * - Compound (squat, bench, row): +2.5kg
 * - Isolation (curl, extension, raise): +1.25kg
 * - Others: +2.5kg default
 */
function findNextWeight(
  currentWeight: number,
  availableWeights: number[],
  exerciseCategory?: 'compound' | 'isolation' | 'rehab' | 'mobility' | 'core'
): number {
  const higherWeights = availableWeights
    .filter(w => w > currentWeight)
    .sort((a, b) => a - b)

  if (higherWeights.length === 0) return currentWeight

  // Determine increment based on exercise type
  // Isolation exercises progress slower (smaller muscle groups)
  const increment = exerciseCategory === 'isolation' ? 1.25 : 2.5
  const targetWeight = currentWeight + increment

  // Find the closest weight at or below target + small tolerance
  const ideal = higherWeights.find(w => w <= targetWeight + 0.5)
  return ideal ?? higherWeights[0]
}

export function shouldDeload(weeksSinceLastDeload: number): boolean {
  return weeksSinceLastDeload >= 5
}

export interface PhaseInput {
  currentPhase: 'hypertrophy' | 'transition' | 'strength'
  weeksInPhase: number
  avgPainLevel: number
  progressionConsistency: number
}

export function getPhaseRecommendation(input: PhaseInput): string {
  const { currentPhase, weeksInPhase, avgPainLevel, progressionConsistency } = input

  if (avgPainLevel > 2) return currentPhase

  if (currentPhase === 'hypertrophy' && weeksInPhase >= 6 && progressionConsistency >= 0.7) {
    return 'transition'
  }

  if (currentPhase === 'transition' && weeksInPhase >= 4 && progressionConsistency >= 0.7) {
    return 'strength'
  }

  return currentPhase
}
