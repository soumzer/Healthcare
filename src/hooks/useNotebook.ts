import { useState, useCallback } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { NotebookEntry, NotebookSet, BodyZone } from '../db/types'
import { generateProgram } from '../engine/program-generator'

const MAX_HISTORY = 5
const SKIP_LOOKBACK_DAYS = 60
const SKIP_THRESHOLD = 3

/**
 * Check if a date is within the last N days from now.
 */
function isWithinDays(date: Date, days: number): boolean {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return date >= cutoff
}

/**
 * After 3 skips of the same exercise within 60 days, auto-create a
 * HealthCondition for the skip zone (if one doesn't already exist) and
 * regenerate the workout program so the engine can adapt.
 */
async function autoCreateConditionIfNeeded(
  userId: number,
  exerciseId: number,
  exerciseName: string,
  zone: BodyZone,
): Promise<boolean> {
  // 1. Count recent skips for this specific exercise within SKIP_LOOKBACK_DAYS
  const recentSkipCount = await db.notebookEntries
    .where('[userId+exerciseId]')
    .equals([userId, exerciseId])
    .filter(e => e.skipped === true && isWithinDays(e.date, SKIP_LOOKBACK_DAYS))
    .count()

  if (recentSkipCount < SKIP_THRESHOLD) {
    return false
  }

  // 2. Check if an active HealthCondition already exists for this zone
  const existingCondition = await db.healthConditions
    .where('userId').equals(userId)
    .filter(c => c.bodyZone === zone && c.isActive)
    .first()

  if (existingCondition) {
    return false
  }

  // 3. Create the HealthCondition
  await db.healthConditions.add({
    userId,
    bodyZone: zone,
    label: `Douleur auto-détectée (${exerciseName})`,
    diagnosis: '',
    painLevel: 7,
    since: new Date().toISOString().split('T')[0],
    notes: `Créée automatiquement après 3 skips de ${exerciseName}`,
    isActive: true,
    createdAt: new Date(),
  })

  // 4. Regenerate the workout program with the new condition
  try {
    const profile = await db.userProfiles.get(userId)
    if (!profile) return true // condition was created, but can't regenerate without profile

    const conditions = await db.healthConditions
      .where('userId').equals(userId)
      .filter(c => c.isActive)
      .toArray()

    const equipment = await db.gymEquipment
      .where('userId').equals(userId)
      .toArray()

    const exerciseCatalog = await db.exercises.toArray()

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

    // Merge: preserve exercises that didn't change (keeps progression history)
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

          if (oldEx.exerciseId === newEx.exerciseId) {
            newSession.exercises[eIdx] = oldEx
          }
        }
      }
    }

    // Deactivate all currently active programs
    const activePrograms = await db.workoutPrograms
      .where('userId').equals(userId)
      .filter(p => p.isActive)
      .toArray()

    for (const prog of activePrograms) {
      if (prog.id !== undefined) {
        await db.workoutPrograms.update(prog.id, { isActive: false })
      }
    }

    // Save the new program
    await db.workoutPrograms.add({
      userId,
      name: generatedProgram.name,
      type: generatedProgram.type,
      sessions: generatedProgram.sessions,
      isActive: true,
      createdAt: new Date(),
    })
  } catch {
    // Regeneration failed — the condition was still created, which is the
    // important part. Program will be regenerated on next profile edit.
  }

  return true
}

export interface SkipResult {
  /** True if a new HealthCondition was auto-created after >= 3 skips */
  conditionCreated: boolean
}

export interface UseNotebookReturn {
  currentSets: NotebookSet[]
  history: NotebookEntry[]
  lastWeight: number | null
  isSaving: boolean
  addSet: (weightKg: number, reps: number) => void
  updateSet: (index: number, weightKg: number, reps: number) => void
  removeLastSet: () => void
  saveAndNext: () => Promise<void>
  skipExercise: (zone: BodyZone) => Promise<SkipResult>
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

  const skipExercise = useCallback(async (zone: BodyZone): Promise<SkipResult> => {
    if (isSaving) return { conditionCreated: false }
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

      // Auto-create HealthCondition if this exercise has been skipped >= 3 times
      // in the last 60 days (includes the entry we just added above)
      const conditionCreated = await autoCreateConditionIfNeeded(
        userId,
        exerciseId,
        exerciseName,
        zone,
      )

      setCurrentSets([])
      onSkip(zone)
      return { conditionCreated }
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
