import { db } from '../db'
import { BACKUP_CONFIG } from '../constants/config'
import type { UserProfile, HealthCondition, GymEquipment, AvailableWeight, WorkoutProgram, WorkoutSession, ExerciseProgress, PainLog, TrainingPhase } from '../db/types'

// Validation helpers
function isValidBackupStructure(data: unknown): data is {
  version: number
  profile: Record<string, unknown>
  conditions?: unknown[]
  equipment?: unknown[]
  weights?: unknown[]
  programs?: unknown[]
  sessions?: unknown[]
  progress?: unknown[]
  painLogs?: unknown[]
  phases?: unknown[]
} {
  if (typeof data !== 'object' || data === null) return false
  const obj = data as Record<string, unknown>
  return (
    typeof obj.version === 'number' &&
    typeof obj.profile === 'object' && obj.profile !== null
  )
}

// Whitelist extractors - only copy known safe properties
function sanitizeCondition(c: Record<string, unknown>, userId: number): Omit<HealthCondition, 'id'> {
  return {
    userId,
    bodyZone: String(c.bodyZone ?? '') as HealthCondition['bodyZone'],
    label: String(c.label ?? ''),
    diagnosis: String(c.diagnosis ?? ''),
    painLevel: Number(c.painLevel ?? 0),
    since: String(c.since ?? ''),
    notes: String(c.notes ?? ''),
    isActive: Boolean(c.isActive ?? true),
    createdAt: c.createdAt ? new Date(String(c.createdAt)) : new Date(),
  }
}

function sanitizeEquipment(e: Record<string, unknown>, userId: number): Omit<GymEquipment, 'id'> {
  return {
    userId,
    name: String(e.name ?? ''),
    type: String(e.type ?? 'other') as GymEquipment['type'],
    isAvailable: Boolean(e.isAvailable ?? true),
    notes: String(e.notes ?? ''),
  }
}

function sanitizeWeight(w: Record<string, unknown>, userId: number): Omit<AvailableWeight, 'id'> {
  return {
    userId,
    equipmentType: String(w.equipmentType ?? 'dumbbell') as AvailableWeight['equipmentType'],
    weightKg: Number(w.weightKg ?? 0),
    isAvailable: Boolean(w.isAvailable ?? true),
  }
}

function sanitizeProgram(p: Record<string, unknown>, userId: number): Omit<WorkoutProgram, 'id'> {
  return {
    userId,
    name: String(p.name ?? ''),
    type: String(p.type ?? 'custom') as WorkoutProgram['type'],
    sessions: Array.isArray(p.sessions) ? p.sessions as WorkoutProgram['sessions'] : [],
    isActive: Boolean(p.isActive ?? false),
    createdAt: p.createdAt ? new Date(String(p.createdAt)) : new Date(),
  }
}

function sanitizeSession(s: Record<string, unknown>, userId: number): Omit<WorkoutSession, 'id'> {
  return {
    userId,
    programId: Number(s.programId ?? 0),
    sessionName: String(s.sessionName ?? ''),
    startedAt: s.startedAt ? new Date(String(s.startedAt)) : new Date(),
    completedAt: s.completedAt ? new Date(String(s.completedAt)) : undefined,
    exercises: Array.isArray(s.exercises) ? s.exercises as WorkoutSession['exercises'] : [],
    endPainChecks: Array.isArray(s.endPainChecks) ? s.endPainChecks as WorkoutSession['endPainChecks'] : [],
    notes: String(s.notes ?? ''),
  }
}

function sanitizeProgress(p: Record<string, unknown>, userId: number): Omit<ExerciseProgress, 'id'> {
  return {
    userId,
    exerciseId: Number(p.exerciseId ?? 0),
    exerciseName: String(p.exerciseName ?? ''),
    date: p.date ? new Date(String(p.date)) : new Date(),
    sessionId: Number(p.sessionId ?? 0),
    weightKg: Number(p.weightKg ?? 0),
    reps: Number(p.reps ?? 0),
    repsPerSet: Array.isArray(p.repsPerSet) ? p.repsPerSet.map(Number) : undefined,
    sets: Number(p.sets ?? 0),
    avgRepsInReserve: Number(p.avgRepsInReserve ?? 0),
    avgRestSeconds: Number(p.avgRestSeconds ?? 0),
    exerciseOrder: Number(p.exerciseOrder ?? 0),
    phase: String(p.phase ?? 'hypertrophy') as ExerciseProgress['phase'],
    weekNumber: Number(p.weekNumber ?? 0),
    prescribedReps: p.prescribedReps !== undefined ? Number(p.prescribedReps) : undefined,
    prescribedRestSeconds: p.prescribedRestSeconds !== undefined ? Number(p.prescribedRestSeconds) : undefined,
  }
}

function sanitizePainLog(l: Record<string, unknown>, userId: number): Omit<PainLog, 'id'> {
  return {
    userId,
    zone: String(l.zone ?? '') as PainLog['zone'],
    level: Number(l.level ?? 0),
    context: String(l.context ?? 'rest_day') as PainLog['context'],
    exerciseName: l.exerciseName ? String(l.exerciseName) : undefined,
    date: l.date ? new Date(String(l.date)) : new Date(),
  }
}

function sanitizePhase(p: Record<string, unknown>, userId: number): Omit<TrainingPhase, 'id'> {
  return {
    userId,
    phase: String(p.phase ?? 'hypertrophy') as TrainingPhase['phase'],
    startedAt: p.startedAt ? new Date(String(p.startedAt)) : new Date(),
    endedAt: p.endedAt ? new Date(String(p.endedAt)) : undefined,
    weekCount: Number(p.weekCount ?? 0),
  }
}

export async function exportData(userId: number): Promise<string> {
  const profile = await db.userProfiles.get(userId)
  if (!profile) throw new Error('Profil utilisateur introuvable')

  const conditions = await db.healthConditions.where('userId').equals(userId).toArray()
  const equipment = await db.gymEquipment.where('userId').equals(userId).toArray()
  const weights = await db.availableWeights.where('userId').equals(userId).toArray()
  const programs = await db.workoutPrograms.where('userId').equals(userId).toArray()
  const sessions = await db.workoutSessions.where('userId').equals(userId).toArray()
  const progress = await db.exerciseProgress.where('userId').equals(userId).toArray()
  const painLogs = await db.painLogs.where('userId').equals(userId).toArray()
  const phases = await db.trainingPhases.where('userId').equals(userId).toArray()

  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    profile,
    conditions,
    equipment,
    weights,
    programs,
    sessions,
    progress,
    painLogs,
    phases,
  }, null, 2)
}

export async function importData(json: string): Promise<number> {
  // Validate size before parsing to prevent DoS
  if (json.length > BACKUP_CONFIG.MAX_SIZE_BYTES) {
    throw new Error('Fichier de backup trop volumineux (max 10MB)')
  }

  // Parse and validate structure BEFORE any database operations
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Format JSON invalide')
  }

  if (!isValidBackupStructure(data)) {
    throw new Error('Structure de backup invalide')
  }

  if (data.version !== 1) {
    throw new Error('Version de backup non supportée')
  }

  // Validate arrays are actually arrays before proceeding
  const arrays = ['conditions', 'equipment', 'weights', 'programs', 'sessions', 'progress', 'painLogs', 'phases'] as const
  for (const key of arrays) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      throw new Error(`Format invalide pour ${key}`)
    }
  }

  return await db.transaction('rw',
    [db.userProfiles, db.healthConditions, db.gymEquipment,
     db.availableWeights, db.workoutPrograms, db.workoutSessions,
     db.exerciseProgress, db.painLogs, db.trainingPhases],
    async () => {
      // Clear user data tables (NOT exercises — those are seeded separately)
      await Promise.all([
        db.userProfiles.clear(),
        db.healthConditions.clear(),
        db.gymEquipment.clear(),
        db.availableWeights.clear(),
        db.workoutPrograms.clear(),
        db.workoutSessions.clear(),
        db.exerciseProgress.clear(),
        db.painLogs.clear(),
        db.trainingPhases.clear(),
      ])

      // Strip id so Dexie auto-increments a new one, sanitize profile
      const profile = data.profile as Record<string, unknown>
      const profileData: Omit<UserProfile, 'id'> = {
        name: String(profile.name ?? ''),
        height: Number(profile.height ?? 170),
        weight: Number(profile.weight ?? 70),
        age: Number(profile.age ?? 25),
        sex: (profile.sex === 'female' ? 'female' : 'male'),
        goals: Array.isArray(profile.goals) ? profile.goals as UserProfile['goals'] : [],
        daysPerWeek: Number(profile.daysPerWeek ?? 3),
        minutesPerSession: Number(profile.minutesPerSession ?? 75),
        createdAt: profile.createdAt ? new Date(String(profile.createdAt)) : new Date(),
        updatedAt: profile.updatedAt ? new Date(String(profile.updatedAt)) : new Date(),
      }
      const userId = await db.userProfiles.add(profileData) as number

      // Re-link all data to the new userId using sanitized extractors
      if (data.conditions?.length) {
        await db.healthConditions.bulkAdd(
          (data.conditions as Record<string, unknown>[]).map(c => sanitizeCondition(c, userId))
        )
      }
      if (data.equipment?.length) {
        await db.gymEquipment.bulkAdd(
          (data.equipment as Record<string, unknown>[]).map(e => sanitizeEquipment(e, userId))
        )
      }
      if (data.weights?.length) {
        await db.availableWeights.bulkAdd(
          (data.weights as Record<string, unknown>[]).map(w => sanitizeWeight(w, userId))
        )
      }
      if (data.programs?.length) {
        await db.workoutPrograms.bulkAdd(
          (data.programs as Record<string, unknown>[]).map(p => sanitizeProgram(p, userId))
        )
      }
      if (data.sessions?.length) {
        await db.workoutSessions.bulkAdd(
          (data.sessions as Record<string, unknown>[]).map(s => sanitizeSession(s, userId))
        )
      }
      if (data.progress?.length) {
        await db.exerciseProgress.bulkAdd(
          (data.progress as Record<string, unknown>[]).map(p => sanitizeProgress(p, userId))
        )
      }
      if (data.painLogs?.length) {
        await db.painLogs.bulkAdd(
          (data.painLogs as Record<string, unknown>[]).map(l => sanitizePainLog(l, userId))
        )
      }
      if (data.phases?.length) {
        await db.trainingPhases.bulkAdd(
          (data.phases as Record<string, unknown>[]).map(p => sanitizePhase(p, userId))
        )
      }

      return userId
    }
  )
}
