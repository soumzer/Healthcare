import { calculateProgression, type ProgressionResult } from './progression'
import type { PainAdjustment } from './pain-feedback'
import type { ProgramSession, ProgramExercise, SessionExercise, SessionSet } from '../db/types'

export interface ExerciseHistoryEntry {
  lastWeightKg: number
  lastReps: number[]
  lastAvgRIR: number
  lastAvgRestSeconds?: number
  prescribedRestSeconds?: number
  prescribedSets?: number
  prescribedReps?: number
}

export interface ExerciseHistory {
  [exerciseId: number]: ExerciseHistoryEntry
}

export interface SessionEngineOptions {
  availableWeights?: number[]
  phase?: 'hypertrophy' | 'strength' | 'deload'
  sessionIntensity?: import('../db/types').SessionIntensity
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
    if (!prev) return 0

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
    if (!prev) return pe.targetReps

    // During deload, maintain same reps as prescribed in the program
    if (this.options.phase === 'deload') {
      return pe.targetReps
    }

    const result = this.runProgression(pe, prev)
    return result.nextReps
  }

  private runProgression(pe: ProgramExercise, prev: ExerciseHistoryEntry): ProgressionResult {
    // Cache result to avoid double calculation (weight + reps for same exercise)
    const cached = this.progressionResults.get(pe.exerciseId)
    if (cached) return cached

    const result = calculateProgression({
      prescribedWeightKg: prev.lastWeightKg,
      prescribedReps: prev.prescribedReps ?? pe.targetReps,
      prescribedSets: prev.prescribedSets ?? pe.sets,
      actualReps: prev.lastReps,
      avgRIR: prev.lastAvgRIR,
      avgRestSeconds: prev.lastAvgRestSeconds ?? pe.restSeconds,
      prescribedRestSeconds: prev.prescribedRestSeconds ?? pe.restSeconds,
      availableWeights: this.options.availableWeights?.length
        ? this.options.availableWeights
        : generateDefaultWeights(prev.lastWeightKg),
      phase: this.options.phase ?? 'hypertrophy',
      sessionIntensity: this.options.sessionIntensity,
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
          exercise.prescribedReps = prev.prescribedReps ?? exercise.prescribedReps
        }
      }
    }

    // Remove skipped exercises entirely
    const skippedIds = new Set(
      adjustments.filter((a) => a.action === 'skip').map((a) => a.exerciseId)
    )
    if (skippedIds.size > 0) {
      this.exercises = this.exercises.filter((e) => !skippedIds.has(e.exerciseId))
    }
  }

  getCurrentExercise(): SessionExercise {
    return this.exercises[this.currentIndex]
  }

  getCurrentSetNumber(): number {
    const ex = this.exercises[this.currentIndex]
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
