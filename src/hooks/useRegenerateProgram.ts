import { useCallback, useState } from 'react'
import { db } from '../db'
import { generateProgram } from '../engine/program-generator'

/**
 * Hook that returns a function to regenerate the workout program.
 *
 * Used when health conditions change — reads current user profile, conditions,
 * equipment, weights, and the exercise catalog, then generates a fresh program
 * while deactivating (not deleting) the old one.
 */
export function useRegenerateProgram() {
  const [isRegenerating, setIsRegenerating] = useState(false)

  const regenerate = useCallback(async (userId: number): Promise<{ success: boolean; error?: string }> => {
    setIsRegenerating(true)
    try {
      // 1. Read the current user profile
      const profile = await db.userProfiles.get(userId)
      if (!profile) {
        return { success: false, error: 'Profil utilisateur introuvable.' }
      }

      // 2. Read current active health conditions
      const conditions = await db.healthConditions
        .where('userId').equals(userId)
        .filter(c => c.isActive)
        .toArray()

      // 3. Read equipment
      const equipment = await db.gymEquipment
        .where('userId').equals(userId)
        .toArray()

      // 4. Read exercise catalog
      const exerciseCatalog = await db.exercises.toArray()

      // 5. Generate the new program
      const generatedProgram = generateProgram(
        {
          userId,
          conditions,
          equipment,
          daysPerWeek: profile.daysPerWeek,
          minutesPerSession: profile.minutesPerSession,
        },
        exerciseCatalog,
      )

      // 6b. Merge: preserve exercises that didn't change (keeps progression history)
      const oldProgram = await db.workoutPrograms
        .where('userId').equals(userId)
        .filter(p => p.isActive)
        .first()

      if (oldProgram?.sessions) {
        for (let sIdx = 0; sIdx < generatedProgram.sessions.length; sIdx++) {
          const oldSession = oldProgram.sessions[sIdx]
          const newSession = generatedProgram.sessions[sIdx]
          if (!oldSession || !newSession) continue

          for (let eIdx = 0; eIdx < newSession.exercises.length; eIdx++) {
            const oldEx = oldSession.exercises[eIdx]
            const newEx = newSession.exercises[eIdx]
            if (!oldEx || !newEx) continue

            // Same exercise at same position — keep old params (progression continues)
            if (oldEx.exerciseId === newEx.exerciseId) {
              newSession.exercises[eIdx] = oldEx
            }
          }
        }
      }

      // 7. Deactivate all currently active programs (don't delete — preserve history)
      const activePrograms = await db.workoutPrograms
        .where('userId').equals(userId)
        .filter(p => p.isActive)
        .toArray()

      for (const prog of activePrograms) {
        if (prog.id !== undefined) {
          await db.workoutPrograms.update(prog.id, { isActive: false })
        }
      }

      // 8. Save the new program as active
      await db.workoutPrograms.add({
        userId,
        name: generatedProgram.name,
        type: generatedProgram.type,
        sessions: generatedProgram.sessions,
        isActive: true,
        createdAt: new Date(),
      })

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue.'
      return { success: false, error: message }
    } finally {
      setIsRegenerating(false)
    }
  }, [])

  return { regenerate, isRegenerating }
}
