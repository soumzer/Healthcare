import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, Component, type ReactNode } from 'react'
import { db } from '../db'
import { useSession } from '../hooks/useSession'
import type { ExerciseHistory } from '../engine/session-engine'
import ExerciseView from '../components/session/ExerciseView'
import RestTimer from '../components/session/RestTimer'
import { useNavigate, useSearchParams } from 'react-router-dom'

/** Data loader — resolves all async data then renders SessionRunner */
function SessionContent({
  programId,
  sessionIndex,
}: {
  programId: number
  sessionIndex: number
}) {
  // Combine independent queries that don't depend on user
  const baseData = useLiveQuery(
    async () => {
      const [program, user, allExercises] = await Promise.all([
        db.workoutPrograms.get(programId),
        db.userProfiles.toCollection().first(),
        db.exercises.toArray(),
      ])
      return { program, user, allExercises }
    },
    [programId]
  )

  const program = baseData?.program
  const user = baseData?.user
  const allExercises = baseData?.allExercises

  // Combine all user-dependent queries into a single hook to prevent cascading re-renders
  const userData = useLiveQuery(
    async () => {
      if (!user?.id) return null
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const [conditions, progressData, recentPainLogs] = await Promise.all([
        db.healthConditions.where('userId').equals(user.id).and((c) => c.isActive).toArray(),
        db.exerciseProgress.where('userId').equals(user.id).toArray(),
        db.painLogs.where('userId').equals(user.id).and((p) => p.date >= sevenDaysAgo).toArray(),
      ])
      return { conditions, progressData, recentPainLogs }
    },
    [user?.id]
  )

  const conditions = userData?.conditions
  const progressData = userData?.progressData
  const recentPainLogs = userData?.recentPainLogs

  // Determine current training phase and deload status (READ ONLY - no DB writes)
  const phaseData = useLiveQuery(
    async () => {
      if (!user?.id) return { phase: 'hypertrophy' as const, isDeload: false, needsDeload: false, currentPhaseId: undefined }

      const phases = await db.trainingPhases
        .where('userId')
        .equals(user.id)
        .toArray()
      const sortedPhases = phases.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      const currentPhase = sortedPhases.find((p) => !p.endedAt)

      if (currentPhase?.phase === 'deload') {
        return { phase: 'deload' as const, isDeload: true, needsDeload: false, currentPhaseId: currentPhase.id }
      }

      const lastDeload = sortedPhases.find((p) => p.phase === 'deload')
      let weeksSince = 0
      if (lastDeload) {
        const deloadEnd = lastDeload.endedAt ?? lastDeload.startedAt
        weeksSince = Math.floor((Date.now() - deloadEnd.getTime()) / (7 * 24 * 60 * 60 * 1000))
      } else {
        const allSessions = await db.workoutSessions
          .where('userId')
          .equals(user.id)
          .toArray()
        const firstCompleted = allSessions
          .filter((s) => s.completedAt)
          .sort((a, b) => (a.completedAt?.getTime() ?? 0) - (b.completedAt?.getTime() ?? 0))[0]
        if (firstCompleted?.completedAt) {
          weeksSince = Math.floor(
            (Date.now() - firstCompleted.completedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
          )
        }
      }

      // Automatic deload detection removed with progression engine.
      // Deload is now only active when explicitly set as the current phase.
      const mappedPhase = currentPhase?.phase ?? 'hypertrophy'
      const sessionPhase = mappedPhase === 'transition' ? 'hypertrophy' : mappedPhase
      const isDeloadPhase = mappedPhase === 'deload'
      return {
        phase: isDeloadPhase ? 'deload' as const : sessionPhase as 'hypertrophy' | 'strength' | 'deload',
        isDeload: isDeloadPhase,
        needsDeload: false,
        currentPhaseId: currentPhase?.id,
      }
    },
    [user?.id]
  )

  // Handle deload phase creation in useEffect (side effect, not during render)
  const deloadCreatedRef = useRef(false)
  useEffect(() => {
    if (!phaseData?.needsDeload || deloadCreatedRef.current || !user?.id) return
    deloadCreatedRef.current = true

    const createDeload = async () => {
      try {
        if (phaseData.currentPhaseId) {
          await db.trainingPhases.update(phaseData.currentPhaseId, { endedAt: new Date() })
        }
        await db.trainingPhases.add({
          userId: user.id!,
          phase: 'deload',
          startedAt: new Date(),
          weekCount: 1,
        })
      } catch (error) {
        console.error('Failed to create deload phase:', error)
      }
    }
    createDeload()
  }, [phaseData?.needsDeload, phaseData?.currentPhaseId, user?.id])

  // Validate sessionIndex is within bounds
  const programSession = program?.sessions?.[sessionIndex]
  const isSessionIndexInvalid = program && (
    sessionIndex < 0 ||
    sessionIndex >= (program.sessions?.length ?? 0) ||
    !programSession
  )

  // Handle invalid sessionIndex early with clear error
  if (isSessionIndexInvalid) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-4 text-center">
        <p className="text-red-400 text-lg font-bold mb-2">Seance introuvable</p>
        <p className="text-zinc-400 text-sm mb-4">
          La seance {sessionIndex + 1} n'existe pas dans ce programme.
          {program?.sessions?.length ? ` (${program.sessions.length} seance${program.sessions.length > 1 ? 's' : ''} disponible${program.sessions.length > 1 ? 's' : ''})` : ''}
        </p>
        <a href="/" className="bg-white text-black font-semibold rounded-xl py-3 px-6">
          Retour a l'accueil
        </a>
      </div>
    )
  }

  if (!program || !programSession || !user || !allExercises || !progressData || !phaseData || conditions === undefined || recentPainLogs === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-4 text-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-white text-lg">Chargement...</p>
        <p className="text-zinc-400 text-xs mt-2">
          {!program ? 'programme' : !programSession ? 'session' : !user ? 'profil' : !allExercises ? 'exercices' : !progressData ? 'progression' : !phaseData ? 'phase' : conditions === undefined ? 'conditions' : 'douleurs'}
        </p>
      </div>
    )
  }

  // Build history from progress data — use latest ExerciseProgress entry per exercise
  const history: ExerciseHistory = {}
  const latestByExercise = new Map<number, typeof progressData[0]>()
  for (const p of progressData) {
    const existing = latestByExercise.get(p.exerciseId)
    if (!existing || p.date > existing.date) {
      latestByExercise.set(p.exerciseId, p)
    }
  }
  for (const [exerciseId, p] of latestByExercise) {
    // Only include actual performance data - NOT prescribedReps
    // This prevents the "prescribedReps pollution" bug where deload reps
    // would pollute future calculations
    history[exerciseId] = {
      lastWeightKg: p.weightKg,
      lastReps: p.repsPerSet ?? Array(p.sets).fill(p.reps),
      lastAvgRIR: p.avgRepsInReserve,
      lastAvgRestSeconds: p.avgRestSeconds,
    }
  }

  // Build exercise names map
  const exerciseNames: Record<number, string> = {}
  for (const ex of allExercises) {
    if (ex.id !== undefined) exerciseNames[ex.id] = ex.name
  }

  if (!programSession.exercises || programSession.exercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-4 text-center">
        <p className="text-red-400 text-lg font-bold mb-2">Aucun exercice dans cette séance</p>
        <p className="text-zinc-400 text-xs mb-4">
          program={programId} session={sessionIndex} sessions={program.sessions.length}
        </p>
        <a href="/" className="bg-white text-black font-semibold rounded-xl py-3 px-6">
          Retour
        </a>
      </div>
    )
  }

  return (
    <SessionRunner
      programSession={programSession}
      history={history}
      userId={user.id!}
      programId={programId}
      conditions={conditions ?? []}
      allExercises={allExercises}
      exerciseNames={exerciseNames}
      phase={phaseData.phase}
      userBodyweightKg={user.weight}
    />
  )
}

/** Session runner — only mounts when all data is loaded */
function SessionRunner({
  programSession,
  history,
  userId,
  programId,
  conditions,
  allExercises,
  exerciseNames,
  phase: phaseFromData,
  userBodyweightKg,
}: {
  programSession: import('../db/types').ProgramSession
  history: ExerciseHistory
  userId: number
  programId: number
  conditions: import('../db/types').HealthCondition[]
  allExercises: import('../db/types').Exercise[]
  exerciseNames: Record<number, string>
  phase: 'hypertrophy' | 'strength' | 'deload'
  userBodyweightKg?: number
}) {
  const navigate = useNavigate()

  const session = useSession({
    programSession,
    history,
    userId,
    programId,
    userConditions: conditions.map((c) => c.bodyZone),
    availableExercises: allExercises,
    exerciseNames,
    healthConditions: conditions.length > 0 ? conditions : undefined,
    phase: phaseFromData,
    userBodyweightKg,
  })

  if (session.phase === 'done') {
    return (
      <div className="flex flex-col h-[calc(100dvh-4rem)] p-4 items-center justify-center text-center overflow-hidden">
        <p className="text-3xl font-bold mb-4">Bravo !</p>
        <p className="text-zinc-400 mb-8">Séance enregistrée avec succès.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-white text-black font-semibold rounded-xl py-4 px-8 text-lg"
        >
          Retour
        </button>
      </div>
    )
  }

  if (session.phase === 'warmup_rehab') {
    // WarmupRehabView removed — skip to warmup or exercise
    session.completeWarmupRehab()
    return null
  }

  if (session.phase === 'warmup') {
    // WarmupView removed — will be reimplemented in Task 8
    session.skipWarmup()
    return null
  }

  if (session.phase === 'exercise') {
    if (!session.currentExercise) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] p-4 text-center overflow-hidden">
          <p className="text-red-400 text-lg font-bold mb-2">Aucun exercice trouvé</p>
          <p className="text-zinc-400 text-xs mb-1">
            engineTotal={session.totalExercises} idx={session.exerciseIndex}
          </p>
          <p className="text-zinc-400 text-xs mb-1">
            programExercises={programSession.exercises.length}
          </p>
          <p className="text-zinc-400 text-xs mb-4">
            phase={phaseFromData}
          </p>
          <button onClick={() => navigate('/')} className="bg-white text-black font-semibold rounded-xl py-3 px-6">
            Retour
          </button>
        </div>
      )
    }
    return (
      <ExerciseView
        exercise={session.currentExercise}
        currentSet={session.currentSetNumber}
        totalSets={session.totalSets}
        exerciseIndex={session.exerciseIndex}
        totalExercises={session.totalExercises}
        substitutionSuggestion={session.substitutionSuggestion}
        userId={userId}
        onDone={session.startSet}
        onOccupied={session.markOccupied}
        onNoWeight={session.openWeightPicker}
        onSubstitute={session.substituteExercise}
      />
    )
  }

  if (session.phase === 'set_logger') {
    // SetLogger removed — will be reimplemented in ExerciseNotebook (Task 7)
    return (
      <div className="p-6 text-center text-zinc-400">
        <p>Set logger sera reimplemente dans le notebook.</p>
      </div>
    )
  }

  if (session.phase === 'rest_timer') {
    return (
      <RestTimer
        restSeconds={session.restSeconds}
        restElapsed={session.restElapsed}
        nextSet={session.currentSetNumber}
        totalSets={session.totalSets}
        nextWeightKg={session.currentExercise?.prescribedWeightKg ?? 0}
        nextReps={session.currentExercise?.prescribedReps ?? 0}
        exerciseName={session.currentExercise?.exerciseName ?? ''}
        onSkip={session.completeRestTimer}
      />
    )
  }

  if (session.phase === 'occupied') {
    // ActiveWait removed — will be reimplemented in Task 8
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] p-4 text-center">
        <p className="text-white text-lg font-bold mb-4">Machine occupee</p>
        <button
          onClick={session.markMachineFree}
          className="bg-white text-black font-semibold rounded-xl py-4 px-8 text-lg"
        >
          Machine libre
        </button>
      </div>
    )
  }

  if (session.phase === 'weight_picker') {
    // WeightPicker removed — cancel back to exercise
    session.cancelWeightPicker()
    return null
  }

  if (session.phase === 'cooldown') {
    // CooldownView removed — will be reimplemented in Task 8
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-4rem)] p-4 text-center">
        <p className="text-white text-lg font-bold mb-4">Cooldown</p>
        <button
          onClick={() => session.completeCooldown()}
          className="bg-white text-black font-semibold rounded-xl py-4 px-8 text-lg"
        >
          Terminer
        </button>
      </div>
    )
  }

  return null
}

class SessionErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 text-center">
          <p className="text-red-400 text-lg font-bold mb-2">Erreur de session</p>
          <p className="text-zinc-400 text-sm mb-4">{this.state.error.message}</p>
          <button
            onClick={() => { window.location.href = window.location.pathname.replace(/\/session.*/, '/') }}
            className="bg-white text-black font-semibold rounded-xl py-3 px-6"
          >
            Retour
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// Safe integer parsing with bounds validation
function parseIntSafe(val: string | null, defaultVal: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (val === null) return defaultVal
  const num = parseInt(val, 10)
  if (!Number.isInteger(num) || num < min || num > max) {
    return defaultVal
  }
  return num
}

export default function SessionPage() {
  const [searchParams] = useSearchParams()
  const programId = parseIntSafe(searchParams.get('programId'), 1, 0, 10000)
  const sessionIndex = parseIntSafe(searchParams.get('sessionIndex'), 0, 0, 100)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SessionErrorBoundary>
        <SessionContent programId={programId} sessionIndex={sessionIndex} />
      </SessionErrorBoundary>
    </div>
  )
}
