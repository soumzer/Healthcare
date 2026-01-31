export interface WarmupSet {
  weightKg: number
  reps: number
  label: string
}

/**
 * Round a target weight to the nearest value in the availableWeights list.
 * If no list is provided or it's empty, rounds to the nearest 2.5kg.
 */
function roundWeight(target: number, availableWeights?: number[]): number {
  if (target <= 0) return 0

  if (availableWeights && availableWeights.length > 0) {
    let closest = availableWeights[0]
    let minDiff = Math.abs(target - closest)
    for (const w of availableWeights) {
      const diff = Math.abs(target - w)
      if (diff < minDiff) {
        minDiff = diff
        closest = w
      }
    }
    return closest
  }

  // Default: round to nearest 2.5kg
  return Math.round(target / 2.5) * 2.5
}

/**
 * Generate progressive warmup sets for the first heavy compound exercise.
 *
 * Spec:
 * 1. Empty bar / minimum weight x 10
 * 2. 50% work weight x 8
 * 3. 70% work weight x 5
 * 4. 85% work weight x 3
 * 5. Then work sets begin
 *
 * Rules:
 * - If work weight < 20kg, reduce warmup sets (fewer steps needed)
 * - If work weight is very light (< 8kg), return empty array or just 1 set
 * - Round to nearest available weight when list is provided
 * - Warmup sets do NOT count toward session tracking
 */
export function generateWarmupSets(
  workingWeightKg: number,
  availableWeights?: number[],
): WarmupSet[] {
  // Very light: no warmup needed (bodyweight / tiny weights)
  if (workingWeightKg <= 0) {
    return []
  }

  // Very light weight (e.g., 4kg): just one light set
  if (workingWeightKg < 8) {
    return [{ weightKg: 0, reps: 10, label: 'Sans poids' }]
  }

  // Light weight (8-20kg): abbreviated warmup (empty + ~50%)
  if (workingWeightKg <= 20) {
    const fiftyPct = roundWeight(workingWeightKg * 0.5, availableWeights)
    const sets: WarmupSet[] = [
      { weightKg: 0, reps: 10, label: 'Sans poids' },
    ]
    // Only add 50% set if it's meaningfully different from empty bar
    if (fiftyPct > 0) {
      sets.push({ weightKg: fiftyPct, reps: 8, label: '50%' })
    }
    return sets
  }

  // Heavy weight (>20kg): full progressive warmup
  return [
    { weightKg: 0, reps: 10, label: 'Barre à vide' },
    { weightKg: roundWeight(workingWeightKg * 0.5, availableWeights), reps: 8, label: '50%' },
    { weightKg: roundWeight(workingWeightKg * 0.7, availableWeights), reps: 5, label: '70%' },
    { weightKg: roundWeight(workingWeightKg * 0.85, availableWeights), reps: 3, label: '85%' },
  ]
}
