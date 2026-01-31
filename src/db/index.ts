import Dexie, { type EntityTable } from 'dexie'
import type {
  UserProfile, HealthCondition, GymEquipment, AvailableWeight,
  Exercise, WorkoutProgram, WorkoutSession, ExerciseProgress,
  PainLog, TrainingPhase,
} from './types'

class HealthCoachDB extends Dexie {
  userProfiles!: EntityTable<UserProfile, 'id'>
  healthConditions!: EntityTable<HealthCondition, 'id'>
  gymEquipment!: EntityTable<GymEquipment, 'id'>
  availableWeights!: EntityTable<AvailableWeight, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workoutPrograms!: EntityTable<WorkoutProgram, 'id'>
  workoutSessions!: EntityTable<WorkoutSession, 'id'>
  exerciseProgress!: EntityTable<ExerciseProgress, 'id'>
  painLogs!: EntityTable<PainLog, 'id'>
  trainingPhases!: EntityTable<TrainingPhase, 'id'>

  constructor() {
    super('HealthCoachDB')
    this.version(1).stores({
      userProfiles: '++id, name',
      healthConditions: '++id, userId, bodyZone, isActive',
      gymEquipment: '++id, userId, type, isAvailable',
      availableWeights: '++id, userId, equipmentType, weightKg',
      exercises: '++id, name, category, isRehab, *primaryMuscles, *tags',
      workoutPrograms: '++id, userId, isActive',
      workoutSessions: '++id, userId, programId, startedAt',
      exerciseProgress: '++id, userId, exerciseId, date',
      painLogs: '++id, userId, zone, date',
      trainingPhases: '++id, userId, phase',
    })
  }
}

export const db = new HealthCoachDB()
