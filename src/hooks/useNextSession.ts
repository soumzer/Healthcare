import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { ProgramSession, WorkoutProgram } from '../db/types'

export interface NextSessionExercisePreview {
  name: string
  sets: number
  targetReps: number
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
  nextSession: ProgramSession | null
  canStart: boolean
  restRecommendation: string | null
  program: WorkoutProgram | null
  preview: NextSessionPreview | null
  deloadReminder: string | null
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
      deloadReminder: null,
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
        deloadReminder: null,
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

    // Deload reminder: count how many times this specific session has been completed
    const DELOAD_THRESHOLD = 5
    const sessionCompletionCount = completedSessions.filter(
      (s) => s.sessionName === nextProgramSession.name,
    ).length
    const deloadReminder = sessionCompletionCount >= DELOAD_THRESHOLD
      ? `Semaine ${sessionCompletionCount + 1} — pense au deload`
      : null

    // Estimate time from actual sets and rest per exercise
    // Formula:
    // - Per exercise: sets × (35s work + rest) + 90s transition
    // - Total + 10 min (5 min warmup + 5 min cooldown)
    let totalSeconds = 0
    for (const ex of nextProgramSession.exercises) {
      const setDuration = 35 // ~35 sec per working set
      const exerciseTime = ex.sets * (setDuration + ex.restSeconds)
      const transitionTime = 90 // ~1.5 min per exercise for setup/transition
      totalSeconds += exerciseTime + transitionTime
    }
    const warmupCooldown = 10 * 60 // 5 min warmup + 5 min cooldown
    const estimatedMinutes = Math.round((totalSeconds + warmupCooldown) / 60)

    const minimumRestHours = 24

    // Build session preview with exercise names
    const exerciseIds = nextProgramSession.exercises.map((e) => e.exerciseId)

    // Resolve exercise names from the exercises table
    const exerciseRecords = await db.exercises
      .where('id')
      .anyOf(exerciseIds)
      .toArray()
    const exerciseNameMap = new Map(exerciseRecords.map((e) => [e.id!, e.name]))

    const preview: NextSessionPreview = {
      sessionName: nextProgramSession.name,
      exercises: nextProgramSession.exercises.map((pe) => ({
        name: exerciseNameMap.get(pe.exerciseId) ?? `Exercice #${pe.exerciseId}`,
        sets: pe.sets,
        targetReps: pe.targetReps,
        isRehab: pe.isRehab,
      })),
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
          deloadReminder,
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
      deloadReminder,
    }
  }, [userId])
}
