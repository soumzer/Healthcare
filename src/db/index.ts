import Dexie, { type EntityTable } from 'dexie'
import type {
  UserProfile, HealthCondition, GymEquipment,
  Exercise, WorkoutProgram, WorkoutSession,
  ExerciseNote,
  NotebookEntry, PainReport,
} from './types'

class HealthCoachDB extends Dexie {
  userProfiles!: EntityTable<UserProfile, 'id'>
  healthConditions!: EntityTable<HealthCondition, 'id'>
  gymEquipment!: EntityTable<GymEquipment, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  workoutPrograms!: EntityTable<WorkoutProgram, 'id'>
  workoutSessions!: EntityTable<WorkoutSession, 'id'>
  exerciseNotes!: EntityTable<ExerciseNote, 'id'>
  notebookEntries!: EntityTable<NotebookEntry, 'id'>
  painReports!: EntityTable<PainReport, 'id'>

  constructor() {
    super('HealthCoachDB')
    this.version(1).stores({
      userProfiles: '++id, name',
      healthConditions: '++id, userId, bodyZone, isActive',
      gymEquipment: '++id, userId, type, isAvailable',
      availableWeights: '++id, userId, equipmentType, weightKg',
      exercises: '++id, name, category, isRehab, *primaryMuscles, *tags',
      workoutPrograms: '++id, userId, isActive',
      workoutSessions: '++id, userId, programId, startedAt, completedAt',
      exerciseProgress: '++id, userId, exerciseId, date, [userId+exerciseId]',
      painLogs: '++id, userId, zone, date, [userId+date]',
      trainingPhases: '++id, userId, phase',
    })

    // Version 2: Add exercise notes for persistent reminders
    this.version(2).stores({
      exerciseNotes: '++id, userId, exerciseId, [userId+exerciseId]',
    })

    // Version 3: Add notebook entries & pain reports, remove availableWeights
    this.version(3).stores({
      // Keep all existing tables from v2 unchanged
      userProfiles: '++id, name',
      healthConditions: '++id, userId, bodyZone, isActive',
      gymEquipment: '++id, userId, type, isAvailable',
      exercises: '++id, name, category, isRehab, *primaryMuscles, *tags',
      workoutPrograms: '++id, userId, isActive',
      workoutSessions: '++id, userId, programId, startedAt, completedAt',
      exerciseProgress: '++id, userId, exerciseId, date, [userId+exerciseId]',
      painLogs: '++id, userId, zone, date, [userId+date]',
      trainingPhases: '++id, userId, phase',
      exerciseNotes: '++id, userId, exerciseId, [userId+exerciseId]',
      // New tables
      notebookEntries: '++id, userId, exerciseId, date, [userId+exerciseId], sessionIntensity',
      painReports: '++id, userId, zone, date, [userId+zone]',
      // Remove
      availableWeights: null,
    })

    // Version 4: Remove zombie tables
    this.version(4).stores({
      exerciseProgress: null,
      painLogs: null,
      trainingPhases: null,
    })
  }
}

export const db = new HealthCoachDB()
