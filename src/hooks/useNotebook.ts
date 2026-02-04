import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { NotebookEntry, NotebookSet, BodyZone } from '../db/types'

const MAX_HISTORY = 5

export interface UseNotebookReturn {
  currentSets: NotebookSet[]
  history: NotebookEntry[]
  lastWeight: number | null
  isSaving: boolean
  addSet: (weightKg: number, reps: number) => void
  updateSet: (index: number, weightKg: number, reps: number) => void
  removeLastSet: () => void
  saveAndNext: () => Promise<void>
  skipExercise: (zone: BodyZone) => Promise<void>
}

export function useNotebook(
  userId: number,
  exerciseId: number,
  exerciseName: string,
  sessionIntensity: 'heavy' | 'volume' | 'moderate' | 'rehab',
  onNext: () => void,
  onSkip: (zone: BodyZone) => void,
): UseNotebookReturn {
  const [currentSets, setCurrentSets] = useState<NotebookSet[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Load last N entries for this exercise
  const history = useLiveQuery(
    async () => {
      const entries = await db.notebookEntries
        .where('[userId+exerciseId]')
        .equals([userId, exerciseId])
        .reverse()
        .limit(MAX_HISTORY)
        .toArray()
      return entries.sort((a, b) => b.date.getTime() - a.date.getTime())
    },
    [userId, exerciseId],
    [] as NotebookEntry[]
  )

  // Last weight from history (used by ExerciseNotebook to pre-fill input)
  const lastWeight = history.length > 0 && !history[0].skipped && history[0].sets.length > 0
    ? history[0].sets[0].weightKg
    : null

  const addSet = useCallback((weightKg: number, reps: number) => {
    setCurrentSets(prev => [...prev, { weightKg, reps }])
  }, [])

  const updateSet = useCallback((index: number, weightKg: number, reps: number) => {
    setCurrentSets(prev => prev.map((s, i) => i === index ? { weightKg, reps } : s))
  }, [])

  const removeLastSet = useCallback(() => {
    setCurrentSets(prev => prev.slice(0, -1))
  }, [])

  const saveAndNext = useCallback(async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const validSets = currentSets.filter(s => s.reps > 0)
      const entry: NotebookEntry = {
        userId,
        exerciseId,
        exerciseName,
        date: new Date(),
        sessionIntensity,
        sets: validSets,
        skipped: false,
      }
      await db.notebookEntries.add(entry)
      setCurrentSets([])
      onNext()
    } finally {
      setIsSaving(false)
    }
  }, [userId, exerciseId, exerciseName, sessionIntensity, currentSets, isSaving, onNext])

  const skipExercise = useCallback(async (zone: BodyZone) => {
    if (isSaving) return
    setIsSaving(true)
    try {
      // Save skipped entry
      const entry: NotebookEntry = {
        userId,
        exerciseId,
        exerciseName,
        date: new Date(),
        sessionIntensity,
        sets: [],
        skipped: true,
        skipZone: zone,
      }
      await db.notebookEntries.add(entry)

      // Create pain report with 3-4 days of rehab accentuation
      await db.painReports.add({
        userId,
        zone,
        date: new Date(),
        fromExerciseName: exerciseName,
        accentDaysRemaining: 3,
      })

      setCurrentSets([])
      onSkip(zone)
    } finally {
      setIsSaving(false)
    }
  }, [userId, exerciseId, exerciseName, sessionIntensity, isSaving, onSkip])

  return {
    currentSets,
    history,
    lastWeight,
    isSaving,
    addSet,
    updateSet,
    removeLastSet,
    saveAndNext,
    skipExercise,
  }
}
