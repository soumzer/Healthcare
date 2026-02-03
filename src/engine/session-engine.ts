import { calculateProgression, type ProgressionResult } from './progression'
import type { PainAdjustment } from './pain-feedback'
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
  private progressionResults: Map<number, ProgressionResult> = new Map()

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

    // During deload, reduce weight to 60% of last weight used
    if (this.options.phase === 'deload') {
      const deloadWeight = Math.round(prev.lastWeightKg * 0.6 * 2) / 2 // round to nearest 0.5kg
      const availableWeights = this.options.availableWeights ?? generateDefaultWeights(prev.lastWeightKg)
      // Find closest available weight at or below the deload target
      const closest = availableWeights
        .filter(w => w <= deloadWeight)
        .sort((a, b) => b - a)[0]
      return closest ?? deloadWeight
    }

    const result = this.runProgression(pe, prev)
    return result.nextWeightKg
  }

  private calculatePrescribedReps(pe: ProgramExercise): number {
    const prev = this.history[pe.exerciseId]
    // No history = use program's target reps
    if (!prev) return pe.targetReps

    // During deload, use moderate rep range (10) — 60% weight at original reps would be too easy
    if (this.options.phase === 'deload') {
      return Math.max(pe.targetReps, 10)
    }

    const result = this.runProgression(pe, prev)
    return result.nextReps
  }

  private runProgression(pe: ProgramExercise, prev: ExerciseHistoryEntry): ProgressionResult {
    // Cache result to avoid double calculation (weight + reps for same exercise)
    const cached = this.progressionResults.get(pe.exerciseId)
    if (cached) return cached

    // Look up exercise category from catalog
    const exerciseData = this.options.exerciseCatalog?.find(e => e.id === pe.exerciseId)
    const exerciseCategory = exerciseData?.category as 'compound' | 'isolation' | 'rehab' | 'mobility' | 'core' | undefined

    // Use PROGRAM's target reps, NOT history's prescribed reps
    // This is the key fix for the "prescribedReps pollution" bug
    const result = calculateProgression({
      programTargetReps: pe.targetReps,
      programTargetSets: pe.sets,
      lastWeightKg: prev.lastWeightKg,
      lastRepsPerSet: prev.lastReps,
      lastAvgRIR: prev.lastAvgRIR,
      availableWeights: this.options.availableWeights?.length
        ? this.options.availableWeights
        : generateDefaultWeights(prev.lastWeightKg),
      phase: this.options.phase ?? 'hypertrophy',
      sessionIntensity: this.options.sessionIntensity,
      exerciseCategory,
    })

    this.progressionResults.set(pe.exerciseId, result)
    return result
  }

  getProgressionResult(exerciseId: number): ProgressionResult | undefined {
    return this.progressionResults.get(exerciseId)
  }

  applyPainAdjustments(adjustments: PainAdjustment[]): void {
    for (const adj of adjustments) {
      const exercise = this.exercises.find((e) => e.exerciseId === adj.exerciseId)
      if (!exercise) continue

      if (adj.action === 'reduce_weight' && adj.weightMultiplier) {
        const baseWeight = adj.referenceWeightKg ?? exercise.prescribedWeightKg
        exercise.prescribedWeightKg =
          Math.round(baseWeight * adj.weightMultiplier * 2) / 2
      }

      if (adj.action === 'no_progression') {
        // Reset to last session's weight — undo any progression
        const prev = this.history[exercise.exerciseId]
        if (prev) {
          exercise.prescribedWeightKg = prev.lastWeightKg
          // Keep current prescribed reps (already calculated from program's targetReps)
          // Do NOT reset to history's prescribedReps - that was the bug!
        }
      }
    }

    // Remove skipped exercises entirely
    const skippedIds = new Set(
      adjustments.filter((a) => a.action === 'skip').map((a) => a.exerciseId)
    )
    if (skippedIds.size > 0) {
      // Track which exercise is current before removing
      const currentExerciseId = this.currentIndex < this.exercises.length
        ? this.exercises[this.currentIndex].exerciseId
        : null
      this.exercises = this.exercises.filter((e) => !skippedIds.has(e.exerciseId))
      // Recalculate currentIndex: find the current exercise in the filtered list
      if (currentExerciseId !== null && !skippedIds.has(currentExerciseId)) {
        this.currentIndex = this.exercises.findIndex((e) => e.exerciseId === currentExerciseId)
        if (this.currentIndex < 0) this.currentIndex = 0
      } else {
        // Current exercise was skipped — reset to 0 (next available)
        this.currentIndex = 0
      }
    }
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
