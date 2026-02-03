import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback } from 'react'
import { db } from '../db'

export interface UseExerciseNoteReturn {
  note: string | null
  isLoading: boolean
  saveNote: (note: string) => Promise<void>
  deleteNote: () => Promise<void>
}

/**
 * Hook to manage persistent notes for an exercise.
 * Notes are saved per user+exercise and persist across sessions.
 */
export function useExerciseNote(
  userId: number | undefined,
  exerciseId: number | undefined
): UseExerciseNoteReturn {
  const noteRecord = useLiveQuery(
    async () => {
      if (!userId || !exerciseId) return null
      return db.exerciseNotes
        .where('[userId+exerciseId]')
        .equals([userId, exerciseId])
        .first()
    },
    [userId, exerciseId]
  )

  const saveNote = useCallback(
    async (note: string) => {
      if (!userId || !exerciseId) return

      const trimmed = note.trim()
      if (!trimmed) {
        // Empty note = delete
        await db.exerciseNotes
          .where('[userId+exerciseId]')
          .equals([userId, exerciseId])
          .delete()
        return
      }

      const existing = await db.exerciseNotes
        .where('[userId+exerciseId]')
        .equals([userId, exerciseId])
        .first()

      const now = new Date()
      if (existing?.id) {
        await db.exerciseNotes.update(existing.id, {
          note: trimmed,
          updatedAt: now,
        })
      } else {
        await db.exerciseNotes.add({
          userId,
          exerciseId,
          note: trimmed,
          createdAt: now,
          updatedAt: now,
        })
      }
    },
    [userId, exerciseId]
  )

  const deleteNote = useCallback(async () => {
    if (!userId || !exerciseId) return
    await db.exerciseNotes
      .where('[userId+exerciseId]')
      .equals([userId, exerciseId])
      .delete()
  }, [userId, exerciseId])

  return {
    note: noteRecord?.note ?? null,
    isLoading: noteRecord === undefined,
    saveNote,
    deleteNote,
  }
}
