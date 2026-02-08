import { useState, useCallback, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { NotebookEntry, NotebookSet, BodyZone } from '../db/types'
import type { QuestionnaireResult } from '../components/onboarding/SymptomQuestionnaire'
import { generateProgram } from '../engine/program-generator'

const MAX_HISTORY = 5
const SKIP_LOOKBACK_DAYS = 60
const SKIP_THRESHOLD = 3

function normalizeForMatching(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

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

    // Note: ProgramExercise is pure prescription (sets/reps/rest).
    // Progression data (weights) lives in WorkoutSession logs, not here.
    // No merge needed — always use freshly generated parameters.

    // Deactivate + create in a single transaction
    await db.transaction('rw', db.workoutPrograms, async () => {
      const activePrograms = await db.workoutPrograms
        .where('userId').equals(userId)
        .filter(p => p.isActive)
        .toArray()

      for (const prog of activePrograms) {
        if (prog.id !== undefined) {
          await db.workoutPrograms.update(prog.id, { isActive: false })
        }
      }

      await db.workoutPrograms.add({
        userId,
        name: generatedProgram.name,
        type: generatedProgram.type,
        sessions: generatedProgram.sessions,
        isActive: true,
        createdAt: new Date(),
      })
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
  skipExercise: (zone: BodyZone, questionnaireResult?: QuestionnaireResult) => Promise<SkipResult>
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
  const [todayEntryId, setTodayEntryId] = useState<number | null>(null)
  const [loadedEntry, setLoadedEntry] = useState(false)

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

  // Reset state when exercise changes (defensive — component usually unmounts)
  useEffect(() => {
    setTodayEntryId(null)
    setLoadedEntry(false)
    setCurrentSets([])
  }, [exerciseId])

  // Load today's entry for editing (re-open completed exercise)
  useEffect(() => {
    if (loadedEntry || history.length === 0) return
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayEntry = history.find(e => {
      const d = e.date instanceof Date ? e.date : new Date(e.date)
      return d >= today && !e.skipped && e.sets.length > 0
    })
    if (todayEntry?.id) {
      setCurrentSets(todayEntry.sets)
      setTodayEntryId(todayEntry.id)
    }
    setLoadedEntry(true)
  }, [history, loadedEntry])

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
      if (todayEntryId) {
        // Update existing entry instead of creating a duplicate
        await db.notebookEntries.update(todayEntryId, {
          sets: validSets,
          date: new Date(),
        })
      } else {
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
      }

      // Bodyweight progression: +1 set when all sets hit 20+ reps (cap 5)
      if (validSets.length > 0 && validSets.every(s => s.reps >= 20)) {
        const activeProgram = await db.workoutPrograms
          .where('userId').equals(userId)
          .filter(p => p.isActive && p.name.includes('Poids de Corps'))
          .first()

        if (activeProgram?.id !== undefined) {
          const updatedSessions = activeProgram.sessions.map(s => ({
            ...s,
            exercises: s.exercises.map(e =>
              e.exerciseId === exerciseId && e.sets < 5
                ? { ...e, sets: e.sets + 1 }
                : e,
            ),
          }))
          await db.workoutPrograms.update(activeProgram.id, { sessions: updatedSessions })
        }
      }

      setCurrentSets([])
      onNext()
    } finally {
      setIsSaving(false)
    }
  }, [userId, exerciseId, exerciseName, sessionIntensity, currentSets, isSaving, onNext, todayEntryId])

  const skipExercise = useCallback(async (zone: BodyZone, questionnaireResult?: QuestionnaireResult): Promise<SkipResult> => {
    if (isSaving) return { conditionCreated: false }
    setIsSaving(true)
    try {
      // Save skipped entry (include any sets entered before skip)
      const validSets = currentSets.filter(s => s.reps > 0)
      if (todayEntryId) {
        await db.notebookEntries.update(todayEntryId, {
          sets: validSets,
          skipped: true,
          skipZone: zone,
          date: new Date(),
        })
      } else {
        const entry: NotebookEntry = {
          userId,
          exerciseId,
          exerciseName,
          date: new Date(),
          sessionIntensity,
          sets: validSets,
          skipped: true,
          skipZone: zone,
        }
        await db.notebookEntries.add(entry)
      }

      // Create pain report with 3-4 days of rehab accentuation
      await db.painReports.add({
        userId,
        zone,
        date: new Date(),
        fromExerciseName: exerciseName,
        accentDaysRemaining: 3,
      })

      // Create HealthCondition from QCM result if a diagnosis was identified
      let conditionCreated = false
      if (questionnaireResult?.protocolConditionName) {
        const normalizedDiagnosis = normalizeForMatching(questionnaireResult.protocolConditionName)
        const existingCondition = await db.healthConditions
          .where('userId').equals(userId)
          .filter(c =>
            c.isActive &&
            c.bodyZone === zone &&
            normalizeForMatching(c.diagnosis) === normalizedDiagnosis
          )
          .first()

        if (!existingCondition) {
          await db.healthConditions.add({
            userId,
            bodyZone: zone,
            label: questionnaireResult.conditionName,
            diagnosis: questionnaireResult.protocolConditionName,
            painLevel: 0,
            since: new Date().toISOString().split('T')[0],
            notes: `Créée via QCM au skip de ${exerciseName}`,
            isActive: true,
            createdAt: new Date(),
          })
          conditionCreated = true
        }
      }

      // Auto-create HealthCondition if this exercise has been skipped >= 3 times
      // in the last 60 days (includes the entry we just added above)
      if (!conditionCreated) {
        conditionCreated = await autoCreateConditionIfNeeded(
          userId,
          exerciseId,
          exerciseName,
          zone,
        )
      }

      setCurrentSets([])
      onSkip(zone)
      return { conditionCreated }
    } finally {
      setIsSaving(false)
    }
  }, [userId, exerciseId, exerciseName, sessionIntensity, currentSets, isSaving, onSkip, todayEntryId])

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
