import { db } from '../db'
import type { UserProfile, HealthCondition, GymEquipment, WorkoutProgram, WorkoutSession, NotebookEntry, PainReport } from '../db/types'
import type { BodyZone, NotebookSet } from '../db/types'

// Validation helpers
function isValidBackupStructure(data: unknown): data is {
  version: number
  profile: Record<string, unknown>
  conditions?: unknown[]
  equipment?: unknown[]
  programs?: unknown[]
  sessions?: unknown[]
  notebookEntries?: unknown[]
  painReports?: unknown[]
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

function sanitizeNotebookEntry(e: Record<string, unknown>, userId: number): Omit<NotebookEntry, 'id'> {
  return {
    userId,
    exerciseId: Number(e.exerciseId ?? 0),
    exerciseName: String(e.exerciseName ?? ''),
    date: e.date ? new Date(String(e.date)) : new Date(),
    sessionIntensity: String(e.sessionIntensity ?? 'moderate') as NotebookEntry['sessionIntensity'],
    sets: Array.isArray(e.sets) ? (e.sets as NotebookSet[]) : [],
    skipped: Boolean(e.skipped ?? false),
    skipZone: e.skipZone ? String(e.skipZone) as BodyZone : undefined,
  }
}

function sanitizePainReport(r: Record<string, unknown>, userId: number): Omit<PainReport, 'id'> {
  return {
    userId,
    zone: String(r.zone ?? '') as BodyZone,
    date: r.date ? new Date(String(r.date)) : new Date(),
    fromExerciseName: String(r.fromExerciseName ?? ''),
    accentDaysRemaining: Number(r.accentDaysRemaining ?? 0),
  }
}

export async function exportData(userId: number): Promise<string> {
  const profile = await db.userProfiles.get(userId)
  if (!profile) throw new Error('Profil utilisateur introuvable')

  const conditions = await db.healthConditions.where('userId').equals(userId).toArray()
  const equipment = await db.gymEquipment.where('userId').equals(userId).toArray()
  const programs = await db.workoutPrograms.where('userId').equals(userId).toArray()
  const sessions = await db.workoutSessions.where('userId').equals(userId).toArray()
  const notebookEntries = await db.notebookEntries.where('userId').equals(userId).toArray()
  const painReports = await db.painReports.where('userId').equals(userId).toArray()

  return JSON.stringify({
    version: 2,
    exportedAt: new Date().toISOString(),
    profile,
    conditions,
    equipment,
    programs,
    sessions,
    notebookEntries,
    painReports,
  }, null, 2)
}

export async function importData(json: string): Promise<number> {
  if (json.length > 10 * 1024 * 1024) {
    throw new Error('Fichier de backup trop volumineux (max 10MB)')
  }

  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('Format JSON invalide')
  }

  if (!isValidBackupStructure(data)) {
    throw new Error('Structure de backup invalide')
  }

  if (data.version !== 1 && data.version !== 2) {
    throw new Error('Version de backup non supportée')
  }

  const arrays = ['conditions', 'equipment', 'programs', 'sessions', 'notebookEntries', 'painReports'] as const
  for (const key of arrays) {
    if (data[key] !== undefined && !Array.isArray(data[key])) {
      throw new Error(`Format invalide pour ${key}`)
    }
  }

  return await db.transaction('rw',
    [db.userProfiles, db.healthConditions, db.gymEquipment,
     db.workoutPrograms, db.workoutSessions,
     db.notebookEntries, db.painReports],
    async () => {
      await Promise.all([
        db.userProfiles.clear(),
        db.healthConditions.clear(),
        db.gymEquipment.clear(),
        db.workoutPrograms.clear(),
        db.workoutSessions.clear(),
        db.notebookEntries.clear(),
        db.painReports.clear(),
      ])

      const profile = data.profile as Record<string, unknown>
      const profileData: Omit<UserProfile, 'id'> = {
        name: String(profile.name ?? ''),
        height: Number(profile.height ?? 170),
        weight: Number(profile.weight ?? 70),
        age: Number(profile.age ?? 25),
        sex: (profile.sex === 'female' ? 'female' : 'male'),
        daysPerWeek: Number(profile.daysPerWeek ?? 3),
        minutesPerSession: Number(profile.minutesPerSession ?? 75),
        createdAt: profile.createdAt ? new Date(String(profile.createdAt)) : new Date(),
        updatedAt: profile.updatedAt ? new Date(String(profile.updatedAt)) : new Date(),
      }
      const userId = await db.userProfiles.add(profileData) as number

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
      const programIdMap = new Map<number, number>()
      if (data.programs?.length) {
        for (const p of data.programs as Record<string, unknown>[]) {
          const oldId = Number(p.id ?? 0)
          const newId = await db.workoutPrograms.add(sanitizeProgram(p, userId)) as number
          if (oldId > 0) programIdMap.set(oldId, newId)
        }
      }
      if (data.sessions?.length) {
        await db.workoutSessions.bulkAdd(
          (data.sessions as Record<string, unknown>[]).map(s => {
            const sanitized = sanitizeSession(s, userId)
            const oldProgramId = Number((s as Record<string, unknown>).programId ?? 0)
            if (programIdMap.has(oldProgramId)) {
              sanitized.programId = programIdMap.get(oldProgramId)!
            }
            return sanitized
          })
        )
      }
      if (data.notebookEntries?.length) {
        await db.notebookEntries.bulkAdd(
          (data.notebookEntries as Record<string, unknown>[]).map(e => sanitizeNotebookEntry(e, userId))
        )
      }
      if (data.painReports?.length) {
        await db.painReports.bulkAdd(
          (data.painReports as Record<string, unknown>[]).map(r => sanitizePainReport(r, userId))
        )
      }

      return userId
    }
  )
}
