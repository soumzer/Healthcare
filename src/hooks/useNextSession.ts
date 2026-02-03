import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { shouldDeload } from '../engine/progression'
import type { ProgramSession, WorkoutProgram } from '../db/types'

export interface NextSessionExercisePreview {
  name: string
  sets: number
  targetReps: number
  estimatedWeightKg: number  // From last session's progression, or 0 if first time
  isRehab: boolean
}

export interface NextSessionPreview {
  sessionName: string
  exercises: NextSessionExercisePreview[]
}

export interface NextSessionInfo {
  status: 'ready' | 'rest_recommended' | 'no_program'
  nextSessionName?: string
  nextSessionIndex?: number
  programId?: number
  exerciseCount?: number
  estimatedMinutes?: number
  lastSessionDate?: Date
  hoursSinceLastSession?: number
  minimumRestHours: number
  // New fields for Task 6 integration
  nextSession: ProgramSession | null
  canStart: boolean
  restRecommendation: string | null
  program: WorkoutProgram | null
  // Task 9: Session preview with exercise names and weights
  preview: NextSessionPreview | null
  // Task 11: Deload and phase tracking
  isDeload: boolean
  currentPhase: 'hypertrophy' | 'transition' | 'strength' | 'deload'
  weeksSinceLastDeload: number
}

export function useNextSession(userId: number | undefined): NextSessionInfo | undefined {
  return useLiveQuery(async () => {
    if (!userId) return {
      status: 'no_program' as const,
      minimumRestHours: 24,
      nextSession: null,
      canStart: false,
      restRecommendation: null,
      program: null,
      preview: null,
      isDeload: false,
      currentPhase: 'hypertrophy' as const,
      weeksSinceLastDeload: 0,
    }

    // Find active program for this user
    const activeProgram = await db.workoutPrograms
      .where('userId')
      .equals(userId)
      .and((p) => p.isActive)
      .first()

    if (!activeProgram || !activeProgram.sessions || activeProgram.sessions.length === 0) {
      return {
        status: 'no_program' as const,
        minimumRestHours: 24,
        nextSession: null,
        canStart: false,
        restRecommendation: null,
        program: null,
        preview: null,
        isDeload: false,
        currentPhase: 'hypertrophy' as const,
        weeksSinceLastDeload: 0,
      }
    }

    // Find last completed workout session for this program
    const allSessions = await db.workoutSessions
      .where('programId')
      .equals(activeProgram.id!)
      .toArray()

    // Filter to completed sessions (have completedAt) and sort by completedAt desc
    const completedSessions = allSessions
      .filter((s) => s.completedAt)
      .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))

    const lastSession = completedSessions.length > 0 ? completedSessions[0] : undefined

    // Determine next session index
    let nextSessionIndex = 0
    if (lastSession) {
      // Find the index of the last completed session by name
      const lastIndex = activeProgram.sessions.findIndex(
        (s) => s.name === lastSession.sessionName
      )
      if (lastIndex >= 0) {
        // Cycle to next session, wrap around
        nextSessionIndex = (lastIndex + 1) % activeProgram.sessions.length
      }
    }

    const nextProgramSession = activeProgram.sessions[nextSessionIndex]
    const exerciseCount = nextProgramSession.exercises.length

    // Estimate time from actual sets and rest per exercise
    let totalSeconds = 0
    for (const ex of nextProgramSession.exercises) {
      const setDuration = 45 // ~45 sec per working set
      totalSeconds += ex.sets * (setDuration + ex.restSeconds)
    }
    const estimatedMinutes = Math.round(totalSeconds / 60) + 5 // +5 min for transitions/warmup

    const minimumRestHours = 24

    // Build session preview with exercise names and estimated weights
    const exerciseIds = nextProgramSession.exercises.map((e) => e.exerciseId)

    // Resolve exercise names from the exercises table
    const exerciseRecords = await db.exercises
      .where('id')
      .anyOf(exerciseIds)
      .toArray()
    const exerciseNameMap = new Map(exerciseRecords.map((e) => [e.id!, e.name]))

    // Get latest exercise progress for each exercise to determine estimated weight
    const progressRecords = await db.exerciseProgress
      .where('exerciseId')
      .anyOf(exerciseIds)
      .and((p) => p.userId === userId)
      .toArray()

    // Group by exerciseId and find the latest entry (by date) for each
    const progressByExercise = new Map<number, typeof progressRecords>()
    for (const p of progressRecords) {
      const list = progressByExercise.get(p.exerciseId) || []
      list.push(p)
      progressByExercise.set(p.exerciseId, list)
    }
    const weightMap = new Map<number, number>()
    for (const [exId, entries] of progressByExercise) {
      entries.sort((a, b) => b.date.getTime() - a.date.getTime())
      weightMap.set(exId, entries[0].weightKg)
    }

    // Deload detection: check TrainingPhase records for weeks since last deload
    const phaseRecords = await db.trainingPhases
      .where('userId')
      .equals(userId)
      .toArray()
    const sortedPhases = phaseRecords.sort(
      (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
    )
    const currentPhaseRecord = sortedPhases.find((p) => !p.endedAt)
    const currentPhase = currentPhaseRecord?.phase ?? 'hypertrophy'

    // Calculate weeks since last deload
    const lastDeloadPhase = sortedPhases.find((p) => p.phase === 'deload')
    let weeksSinceLastDeload = 0
    if (lastDeloadPhase) {
      const deloadEnd = lastDeloadPhase.endedAt ?? lastDeloadPhase.startedAt
      weeksSinceLastDeload = Math.floor(
        (Date.now() - deloadEnd.getTime()) / (7 * 24 * 60 * 60 * 1000)
      )
    } else if (completedSessions.length > 0) {
      // No deload ever — count weeks from first session
      const firstSessionDate = completedSessions[completedSessions.length - 1].completedAt
      if (firstSessionDate) {
        weeksSinceLastDeload = Math.floor(
          (Date.now() - firstSessionDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
        )
      }
    }

    const isDeload = shouldDeload(weeksSinceLastDeload) || currentPhase === 'deload'

    const preview: NextSessionPreview = {
      sessionName: nextProgramSession.name,
      exercises: nextProgramSession.exercises.map((pe) => {
        const baseWeight = weightMap.get(pe.exerciseId) ?? 0
        return {
          name: exerciseNameMap.get(pe.exerciseId) ?? `Exercice #${pe.exerciseId}`,
          sets: pe.sets,
          targetReps: pe.targetReps,
          estimatedWeightKg: isDeload ? Math.round(baseWeight * 0.6 * 2) / 2 : baseWeight,
          isRehab: pe.isRehab,
        }
      }),
    }

    // Calculate hours since last session
    if (lastSession?.completedAt) {
      const now = new Date()
      const diffMs = now.getTime() - lastSession.completedAt.getTime()
      const hoursSinceLastSession = diffMs / (1000 * 60 * 60)

      if (hoursSinceLastSession < minimumRestHours) {
        const remainingHours = Math.ceil(minimumRestHours - hoursSinceLastSession)
        return {
          status: 'rest_recommended' as const,
          nextSessionName: nextProgramSession.name,
          nextSessionIndex,
          programId: activeProgram.id!,
          exerciseCount,
          estimatedMinutes,
          lastSessionDate: lastSession.completedAt,
          hoursSinceLastSession,
          minimumRestHours,
          nextSession: nextProgramSession,
          canStart: false,
          restRecommendation: `Repos recommandé : encore ${remainingHours}h avant la prochaine séance`,
          program: activeProgram,
          preview,
          isDeload,
          currentPhase,
          weeksSinceLastDeload,
        }
      }
    }

    return {
      status: 'ready' as const,
      nextSessionName: nextProgramSession.name,
      nextSessionIndex,
      programId: activeProgram.id!,
      exerciseCount,
      estimatedMinutes,
      lastSessionDate: lastSession?.completedAt,
      hoursSinceLastSession: lastSession?.completedAt
        ? (new Date().getTime() - lastSession.completedAt.getTime()) / (1000 * 60 * 60)
        : undefined,
      minimumRestHours,
      nextSession: nextProgramSession,
      canStart: true,
      restRecommendation: null,
      program: activeProgram,
      preview,
      isDeload,
      currentPhase,
      weeksSinceLastDeload,
    }
  }, [userId])
}
