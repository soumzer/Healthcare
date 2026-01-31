import type { ProgramSession, SessionExercise, SessionSet } from '../db/types'

export interface ExerciseHistory {
  [exerciseId: number]: {
    lastWeightKg: number
    lastReps: number[]
    lastAvgRIR: number
  }
}

export class SessionEngine {
  private exercises: SessionExercise[]
  private currentIndex: number = 0
  private occupied: boolean = false
  private history: ExerciseHistory

  constructor(programSession: ProgramSession, history: ExerciseHistory) {
    this.history = history
    this.exercises = programSession.exercises.map((pe) => ({
      exerciseId: pe.exerciseId,
      exerciseName: '',
      order: pe.order,
      prescribedSets: pe.sets,
      prescribedReps: pe.targetReps,
      prescribedWeightKg: this.calculatePrescribedWeight(pe.exerciseId, pe.targetReps),
      sets: [],
      status: 'pending' as const,
    }))
  }

  private calculatePrescribedWeight(exerciseId: number, targetReps: number): number {
    const prev = this.history[exerciseId]
    if (!prev) return 0

    const allRepsHit = prev.lastReps.every(r => r >= targetReps)
    const easyEnough = prev.lastAvgRIR >= 2

    if (allRepsHit && easyEnough) {
      return prev.lastWeightKg + 2.5
    }
    return prev.lastWeightKg
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
