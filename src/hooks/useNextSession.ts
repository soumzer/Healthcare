import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import type { ProgramSession, WorkoutProgram } from '../db/types'

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
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())

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

    // Estimate time: ~15 min per exercise (including rest)
    const estimatedMinutes = exerciseCount * 15

    const minimumRestHours = 24

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
          restRecommendation: `Repos recommande : encore ${remainingHours}h avant la prochaine seance`,
          program: activeProgram,
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
    }
  }, [userId])
}
