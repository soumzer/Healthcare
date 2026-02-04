import type { ProgramSession, ProgramExercise, SessionExercise, SessionSet } from '../db/types'

/**
 * Exercise history entry - contains ONLY actual performance data.
 * Does NOT include prescribedReps to avoid the "prescribedReps pollution" bug.
 */
export interface ExerciseHistoryEntry {
  /** Weight used in the last session */
  lastWeightKg: number
  /** Actual reps performed per set */
  lastReps: number[]
  /** Average RIR (reps in reserve) */
  lastAvgRIR: number
  /** Average rest time in seconds (optional) */
  lastAvgRestSeconds?: number
}

export interface ExerciseHistory {
  [exerciseId: number]: ExerciseHistoryEntry
}

export interface SessionEngineOptions {
  availableWeights?: number[]
  phase?: 'hypertrophy' | 'strength' | 'deload'
  sessionIntensity?: import('../db/types').SessionIntensity
  /** User's body weight in kg - used to estimate starting weights for new exercises */
  userBodyweightKg?: number
  /** Exercise catalog for looking up exercise category */
  exerciseCatalog?: Array<{ id?: number; category: string }>
}

export class SessionEngine {
  private exercises: SessionExercise[]
  private currentIndex: number = 0
  private occupied: boolean = false
  private history: ExerciseHistory
  private options: SessionEngineOptions

  constructor(
    programSession: ProgramSession,
    history: ExerciseHistory,
    options: SessionEngineOptions = {},
  ) {
    this.history = history
    this.options = options
    this.exercises = programSession.exercises.map((pe) => ({
      exerciseId: pe.exerciseId,
      exerciseName: '',
      order: pe.order,
      prescribedSets: pe.sets,
      prescribedReps: this.calculatePrescribedReps(pe),
      prescribedWeightKg: this.calculatePrescribedWeight(pe),
      sets: [],
      status: 'pending' as const,
    }))
  }

  private calculatePrescribedWeight(pe: ProgramExercise): number {
    const prev = this.history[pe.exerciseId]
    if (!prev) {
      // No history: estimate starting weight based on rep range
      // Low reps (<=6) suggests compound lift -> use ~20-30% bodyweight
      // Higher reps (8+) suggests isolation -> use ~10-15% bodyweight
      // If no bodyweight, return 0 (bodyweight exercise)
      if (!this.options.userBodyweightKg) return 0
      const bw = this.options.userBodyweightKg
      // Heuristic: lower target reps = heavier compound movement
      const multiplier = pe.targetReps <= 6 ? 0.25 : 0.15
      const estimated = Math.round(bw * multiplier * 2) / 2 // round to 0.5kg
      // Find closest available weight
      const availableWeights = this.options.availableWeights ?? generateDefaultWeights(estimated)
      const closest = availableWeights
        .filter(w => w <= estimated + 2.5)
        .sort((a, b) => Math.abs(a - estimated) - Math.abs(b - estimated))[0]
      return closest ?? estimated
    }

    // With automatic progression removed, simply use last session's weight.
    // The user will manually adjust weights in the notebook-style UI.
    return prev.lastWeightKg
  }

  private calculatePrescribedReps(pe: ProgramExercise): number {
    const prev = this.history[pe.exerciseId]
    // No history = use program's target reps
    if (!prev) return pe.targetReps

    // Without automatic progression, use the program's target reps.
    // The user will manually adjust in the notebook-style UI.
    return pe.targetReps
  }

  getCurrentExercise(): SessionExercise {
    return this.exercises[this.currentIndex]
  }

  getCurrentExerciseIndex(): number {
    return this.currentIndex
  }

  getCurrentSetNumber(): number {
    const ex = this.exercises[this.currentIndex]
    // If exercise is complete, return the completed count (not +1)
    if (ex.sets.length >= ex.prescribedSets) {
      return ex.sets.length
    }
    return ex.sets.length + 1
  }

  completeExercise(): void {
    this.exercises[this.currentIndex].status = 'completed'
    this.currentIndex++
    this.occupied = false
  }

  markOccupied(): void {
    this.occupied = true
  }

  markMachineFree(): void {
    this.occupied = false
  }

  isWaitingForMachine(): boolean {
    return this.occupied
  }

  isSessionComplete(): boolean {
    return this.currentIndex >= this.exercises.length
  }

  logSet(set: SessionSet): void {
    this.exercises[this.currentIndex].sets.push(set)
  }

  isCurrentExerciseComplete(): boolean {
    const ex = this.exercises[this.currentIndex]
    return ex.sets.length >= ex.prescribedSets
  }

  getAllExercises(): SessionExercise[] {
    return this.exercises
  }
}

/**
 * Generates a default set of available weights around the current weight.
 * Used when no explicit available weights are provided.
 * Generates weights in 2.5kg increments from 0 to at least 300kg
 * (covers machine exercises like leg press).
 */
function generateDefaultWeights(currentWeightKg: number): number[] {
  const max = Math.max(currentWeightKg + 20, 300)
  const weights: number[] = []
  for (let w = 0; w <= max; w += 2.5) {
    weights.push(w)
  }
  return weights
}
