import { db } from '../db'
import { exerciseCatalog } from './exercises'

/**
 * Peuple la table `exercises` avec le catalogue complet.
 * Idempotent : ne fait rien si des exercices existent déjà.
 */
export async function seedExercises(): Promise<void> {
  const count = await db.exercises.count()
  if (count > 0) return
  await db.exercises.bulkAdd(exerciseCatalog)
}
