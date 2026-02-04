import { useState, useEffect, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

/**
 * Hook to read/write a persistent note for a given exercise.
 * Notes are stored per user+exercise in the exerciseNotes table.
 */
export function useExerciseNote(userId: number, exerciseId: number) {
  const existing = useLiveQuery(
    () => db.exerciseNotes
      .where('[userId+exerciseId]')
      .equals([userId, exerciseId])
      .first(),
    [userId, exerciseId],
  )

  const [draft, setDraft] = useState('')
  const [dirty, setDirty] = useState(false)

  // Sync draft with DB value when it loads
  useEffect(() => {
    if (existing && !dirty) {
      setDraft(existing.note)
    }
  }, [existing, dirty])

  const save = useCallback(async (text: string) => {
    const trimmed = text.trim()
    const now = new Date()
    if (existing?.id) {
      await db.exerciseNotes.update(existing.id, { note: trimmed, updatedAt: now })
    } else if (trimmed) {
      await db.exerciseNotes.add({
        userId,
        exerciseId,
        note: trimmed,
        createdAt: now,
        updatedAt: now,
      })
    }
    setDirty(false)
  }, [userId, exerciseId, existing])

  const update = useCallback((text: string) => {
    setDraft(text)
    setDirty(true)
  }, [])

  return { note: draft, update, save, isDirty: dirty }
}
