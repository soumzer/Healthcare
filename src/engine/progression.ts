export interface ProgressionInput {
  prescribedWeightKg: number
  prescribedReps: number
  prescribedSets: number
  actualReps: number[]
  avgRIR: number
  avgRestSeconds: number
  prescribedRestSeconds: number
  availableWeights: number[]
  phase: 'hypertrophy' | 'strength' | 'deload'
}

export interface ProgressionResult {
  nextWeightKg: number
  nextReps: number
  action: 'increase_weight' | 'increase_reps' | 'maintain' | 'decrease'
  reason: string
}

export function calculateProgression(input: ProgressionInput): ProgressionResult {
  const {
    prescribedWeightKg, prescribedReps, prescribedSets,
    actualReps, avgRIR, avgRestSeconds, prescribedRestSeconds,
    availableWeights, phase,
  } = input

  const restInflated = avgRestSeconds > prescribedRestSeconds * 1.5
  const allSetsCompleted = actualReps.every(r => r >= prescribedReps)
  const totalPrescribed = prescribedSets * prescribedReps
  const totalActual = actualReps.reduce((a, b) => a + b, 0)
  const repDeficit = 1 - totalActual / totalPrescribed
  const regressed = repDeficit > 0.25

  if (regressed) {
    const lowerWeight = availableWeights
      .filter(w => w < prescribedWeightKg)
      .sort((a, b) => b - a)[0]
    return {
      nextWeightKg: lowerWeight ?? prescribedWeightKg,
      nextReps: prescribedReps,
      action: 'decrease',
      reason: 'Regression significative — on baisse la charge pour relancer',
    }
  }

  if (!allSetsCompleted || avgRIR < 1) {
    return {
      nextWeightKg: prescribedWeightKg,
      nextReps: prescribedReps,
      action: 'maintain',
      reason: 'Series incompletes ou effort maximal — on maintient pour consolider',
    }
  }

  if (restInflated) {
    return {
      nextWeightKg: prescribedWeightKg,
      nextReps: prescribedReps,
      action: 'maintain',
      reason: 'Repos plus long que prevu — performance non comparable, on maintient',
    }
  }

  // Ready to progress — find next weight
  const increment = 2.5
  const targetWeight = prescribedWeightKg + increment
  const nextWeightAvailable = availableWeights
    .filter(w => w > prescribedWeightKg)
    .sort((a, b) => a - b)[0]

  if (nextWeightAvailable && nextWeightAvailable <= targetWeight + 1) {
    return {
      nextWeightKg: nextWeightAvailable,
      nextReps: prescribedReps,
      action: 'increase_weight',
      reason: `Progression — on passe a ${nextWeightAvailable}kg`,
    }
  }

  // No suitable weight, increase reps
  const maxReps = phase === 'strength' ? 8 : 15
  if (prescribedReps < maxReps) {
    return {
      nextWeightKg: prescribedWeightKg,
      nextReps: prescribedReps + 1,
      action: 'increase_reps',
      reason: 'Poids suivant non disponible — on ajoute une rep',
    }
  }

  return {
    nextWeightKg: prescribedWeightKg,
    nextReps: prescribedReps,
    action: 'maintain',
    reason: 'Plafond de reps atteint — progression bloquee sans poids supplementaire',
  }
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
