import { db } from '../db'
import type { UserProfile } from '../db/types'

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
  const data = JSON.parse(json)
  if (data.version !== 1) throw new Error('Version de backup non supportée')

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

      // Strip id so Dexie auto-increments a new one
      const { id: _id, ...profileData } = data.profile
      const userId = await db.userProfiles.add(profileData as Omit<UserProfile, 'id'>) as number

      // Re-link all data to the new userId
      if (data.conditions?.length) await db.healthConditions.bulkAdd(
        data.conditions.map((c: any) => ({ ...c, id: undefined, userId }))
      )
      if (data.equipment?.length) await db.gymEquipment.bulkAdd(
        data.equipment.map((e: any) => ({ ...e, id: undefined, userId }))
      )
      if (data.weights?.length) await db.availableWeights.bulkAdd(
        data.weights.map((w: any) => ({ ...w, id: undefined, userId }))
      )
      if (data.programs?.length) await db.workoutPrograms.bulkAdd(
        data.programs.map((p: any) => ({ ...p, id: undefined, userId }))
      )
      if (data.sessions?.length) await db.workoutSessions.bulkAdd(
        data.sessions.map((s: any) => ({ ...s, id: undefined, userId }))
      )
      if (data.progress?.length) await db.exerciseProgress.bulkAdd(
        data.progress.map((p: any) => ({ ...p, id: undefined, userId }))
      )
      if (data.painLogs?.length) await db.painLogs.bulkAdd(
        data.painLogs.map((l: any) => ({ ...l, id: undefined, userId }))
      )
      if (data.phases?.length) await db.trainingPhases.bulkAdd(
        data.phases.map((p: any) => ({ ...p, id: undefined, userId }))
      )

      return userId
    }
  )
}
