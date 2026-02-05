import { useState, useCallback, useMemo, useEffect, Component, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { db } from '../db'
import ExerciseNotebook from '../components/session/ExerciseNotebook'
import { fixedWarmupRoutine } from '../data/warmup-routine'
import { selectCooldownExercises } from '../engine/cooldown'
import { suggestFillerFromCatalog } from '../engine/filler'
import type { BodyZone, Exercise, ProgramSession } from '../db/types'
import type { SwapOption } from '../components/session/ExerciseNotebook'

type SessionPhase = 'warmup' | 'exercises' | 'notebook' | 'cooldown' | 'done'

interface ExerciseStatus {
  exerciseId: number
  status: 'pending' | 'done' | 'skipped'
  skipZone?: BodyZone
}

function SessionContent({ programId, sessionIndex }: { programId: number; sessionIndex: number }) {
  const navigate = useNavigate()

  const data = useLiveQuery(async () => {
    const [program, user, allExercises] = await Promise.all([
      db.workoutPrograms.get(programId),
      db.userProfiles.toCollection().first(),
      db.exercises.toArray(),
    ])
    if (!user?.id || !program) return null

    const conditions = await db.healthConditions
      .where('userId').equals(user.id)
      .and(c => c.isActive)
      .toArray()

    return { program, user, allExercises, conditions }
  }, [programId])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[calc(100dvh-var(--nav-h))]">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const { program, user, allExercises } = data
  const programSession = program.sessions?.[sessionIndex]

  if (!programSession || !programSession.exercises?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] p-4 text-center">
        <p className="text-red-400 text-lg font-bold mb-2">Seance introuvable</p>
        <button onClick={() => navigate('/')} className="bg-white text-black font-semibold rounded-xl py-3 px-6">
          Retour
        </button>
      </div>
    )
  }

  return (
    <SessionRunner
      programSession={programSession}
      userId={user.id!}
      programId={programId}
      allExercises={allExercises}
    />
  )
}

function SessionRunner({
  programSession,
  userId,
  programId,
  allExercises,
}: {
  programSession: ProgramSession
  userId: number
  programId: number
  allExercises: Exercise[]
}) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<SessionPhase>('warmup')
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0)
  const [exerciseStatuses, setExerciseStatuses] = useState<ExerciseStatus[]>(() =>
    programSession.exercises.map(e => ({ exerciseId: e.exerciseId, status: 'pending' }))
  )
  const [sessionStartTime] = useState(() => new Date())
  const [warmupChecked, setWarmupChecked] = useState<Set<number>>(() => new Set())
  const [recovered, setRecovered] = useState(false)

  // Recover session state from today's notebookEntries
  const todayEntries = useLiveQuery(async () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return db.notebookEntries
      .where('userId').equals(userId)
      .filter(e => {
        const d = e.date instanceof Date ? e.date : new Date(e.date)
        return d >= today
      })
      .toArray()
  }, [userId])

  // Once todayEntries load, recover exercise statuses
  useEffect(() => {
    if (!todayEntries || recovered) return
    const exerciseIds = programSession.exercises.map(e => e.exerciseId)
    const todayByExercise = new Map<number, typeof todayEntries[0]>()
    for (const entry of todayEntries) {
      if (exerciseIds.includes(entry.exerciseId)) {
        todayByExercise.set(entry.exerciseId, entry)
      }
    }

    if (todayByExercise.size > 0) {
      const newStatuses = programSession.exercises.map(e => {
        const entry = todayByExercise.get(e.exerciseId)
        if (entry) {
          return {
            exerciseId: e.exerciseId,
            status: entry.skipped ? 'skipped' as const : 'done' as const,
            skipZone: entry.skipZone,
          }
        }
        return { exerciseId: e.exerciseId, status: 'pending' as const }
      })
      setExerciseStatuses(newStatuses)
      setPhase('exercises')
    }
    setRecovered(true)
  }, [todayEntries, recovered, programSession.exercises])

  // Build exercise catalog lookup
  const exerciseMap = useMemo(() => {
    const map = new Map<number, Exercise>()
    for (const ex of allExercises) {
      if (ex.id !== undefined) map.set(ex.id, ex)
    }
    return map
  }, [allExercises])

  // Session muscles for cooldown
  const sessionMuscles = useMemo(() => {
    const muscles = new Set<string>()
    for (const pe of programSession.exercises) {
      const ex = exerciseMap.get(pe.exerciseId)
      if (ex) {
        for (const m of ex.primaryMuscles) muscles.add(m)
      }
    }
    return [...muscles]
  }, [programSession.exercises, exerciseMap])

  const cooldownExercises = useMemo(
    () => selectCooldownExercises(sessionMuscles, allExercises),
    [sessionMuscles, allExercises]
  )

  // Current exercise info
  const currentProgramExercise = programSession.exercises[currentExerciseIdx]
  const currentCatalogExercise = currentProgramExercise
    ? exerciseMap.get(currentProgramExercise.exerciseId)
    : undefined

  // Filler suggestions for machine occupied
  const fillerSuggestions = useMemo(() => {
    if (!currentCatalogExercise) return []
    const sessionMuscles = currentCatalogExercise.primaryMuscles
    return suggestFillerFromCatalog({
      sessionMuscles,
      completedFillers: [],
      exerciseCatalog: allExercises,
    })
  }, [currentCatalogExercise, allExercises])

  const handleNextExercise = useCallback(() => {
    // Mark current as done
    setExerciseStatuses(prev => prev.map((s, i) =>
      i === currentExerciseIdx ? { ...s, status: 'done' as const } : s
    ))
    setPhase('exercises')
  }, [currentExerciseIdx])

  const handleSkipExercise = useCallback((zone: BodyZone) => {
    setExerciseStatuses(prev => prev.map((s, i) =>
      i === currentExerciseIdx ? { ...s, status: 'skipped' as const, skipZone: zone } : s
    ))
    setPhase('exercises')
  }, [currentExerciseIdx])

  const handleOpenExercise = useCallback((idx: number) => {
    setCurrentExerciseIdx(idx)
    setPhase('notebook')
  }, [])

  const allDone = exerciseStatuses.every(s => s.status !== 'pending')

  const handleFinishSession = useCallback(async () => {
    try {
      await db.workoutSessions.add({
        userId,
        programId,
        sessionName: programSession.name,
        startedAt: sessionStartTime,
        completedAt: new Date(),
        exercises: programSession.exercises.map((pe, i) => ({
          exerciseId: pe.exerciseId,
          exerciseName: exerciseMap.get(pe.exerciseId)?.name ?? '',
          prescribedSets: pe.sets,
          prescribedReps: pe.targetReps,
          prescribedWeightKg: 0,
          sets: [],
          order: i + 1,
          status: exerciseStatuses[i]?.status === 'done' ? 'completed' as const : 'skipped' as const,
          skippedReason: exerciseStatuses[i]?.status === 'skipped' ? 'pain' as const : undefined,
        })),
        endPainChecks: [],
        notes: '',
      })
    } catch (error) {
      console.error('Failed to save session:', error)
    }
    setPhase('done')
  }, [userId, programId, programSession, sessionStartTime, exerciseStatuses, exerciseMap])

  // Swap: resolve alternatives for the current exercise
  const swapOptions: SwapOption[] = useMemo(() => {
    if (!currentCatalogExercise?.alternatives) return []
    return currentCatalogExercise.alternatives
      .map((altName) => {
        const match = allExercises.find((e) => e.name === altName)
        return match?.id ? { exerciseId: match.id, name: match.name } : null
      })
      .filter((x): x is SwapOption => x !== null)
  }, [currentCatalogExercise, allExercises])

  const handleSwapExercise = useCallback(async (newExerciseId: number) => {
    const program = await db.workoutPrograms.get(programId)
    if (!program?.sessions) return
    const updatedSessions = program.sessions.map((s) => {
      if (s.name !== programSession.name) return s
      return {
        ...s,
        exercises: s.exercises.map((e, eIdx) =>
          eIdx === currentExerciseIdx ? { ...e, exerciseId: newExerciseId } : e,
        ),
      }
    })
    await db.workoutPrograms.update(programId, { sessions: updatedSessions })
    setPhase('exercises')
  }, [programId, programSession.name, currentExerciseIdx])

  // --- Render phases ---

  if (phase === 'warmup') {
    return (
      <div className="flex flex-col h-[calc(100dvh-var(--nav-h))] overflow-hidden p-4">
        <div className="text-center mb-4">
          <p className="text-zinc-400 text-sm uppercase tracking-wider mb-1">Echauffement</p>
          <h2 className="text-xl font-bold">{programSession.name}</h2>
          <p className="text-zinc-400 text-sm mt-1">Halteres legeres ou barre a vide</p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1">
          {fixedWarmupRoutine.map((item, i) => (
            <button
              key={i}
              onClick={() => setWarmupChecked(prev => {
                const next = new Set(prev)
                next.has(i) ? next.delete(i) : next.add(i)
                return next
              })}
              className="w-full flex items-center gap-3 bg-zinc-900 rounded-lg px-3 py-2 text-left touch-action-manipulation"
              style={{ touchAction: 'manipulation' }}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                warmupChecked.has(i) ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600'
              }`}>
                {warmupChecked.has(i) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className={`text-sm ${warmupChecked.has(i) ? 'text-zinc-500 line-through' : 'text-white'}`}>
                {item.name}
              </span>
              <span className="text-zinc-500 text-xs ml-auto">{item.reps}</span>
            </button>
          ))}
        </div>

        <div className="pt-3 pb-2 flex-shrink-0">
          <button
            onClick={() => setPhase('exercises')}
            className="w-full bg-white text-black font-semibold rounded-xl py-4 text-lg"
          >
            C'est parti
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'exercises') {
    return (
      <div className="flex flex-col h-[calc(100dvh-var(--nav-h))] overflow-hidden p-4">
        <div className="mb-4">
          <h2 className="text-xl font-bold">{programSession.name}</h2>
          <p className="text-zinc-400 text-sm">
            {exerciseStatuses.filter(s => s.status !== 'pending').length}/{programSession.exercises.length} exercices
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {programSession.exercises.map((pe, idx) => {
            const catalog = exerciseMap.get(pe.exerciseId)
            const status = exerciseStatuses[idx]
            const intensity = programSession.intensity as 'heavy' | 'volume' | 'moderate' | undefined
            return (
              <button
                key={pe.exerciseId}
                onClick={() => handleOpenExercise(idx)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ${
                  status.status === 'done' ? 'bg-zinc-900/50' :
                  status.status === 'skipped' ? 'bg-red-900/20' :
                  'bg-zinc-900'
                }`}
              >
                {/* Status icon */}
                <div className="w-6 flex-shrink-0 text-center">
                  {status.status === 'done' && <span className="text-emerald-400">{'\u2713'}</span>}
                  {status.status === 'skipped' && <span className="text-red-400">/</span>}
                  {status.status === 'pending' && <span className="text-zinc-600">{'\u25CB'}</span>}
                </div>

                {/* Exercise info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm ${status.status !== 'pending' ? 'text-zinc-400' : 'text-white'}`}>
                    {catalog?.name ?? `Exercise #${pe.exerciseId}`}
                  </p>
                  <p className="text-zinc-500 text-xs">
                    {pe.sets}x{pe.targetReps} — repos {pe.restSeconds}s
                  </p>
                </div>

                {/* Intensity badge */}
                {intensity && (
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                    intensity === 'heavy' ? 'bg-blue-900/40 text-blue-400' :
                    intensity === 'volume' ? 'bg-emerald-900/40 text-emerald-400' :
                    'bg-amber-900/40 text-amber-400'
                  }`}>
                    {intensity === 'heavy' ? 'F' : intensity === 'volume' ? 'V' : 'M'}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="pt-3 pb-2 flex-shrink-0">
          {allDone ? (
            <button
              onClick={() => cooldownExercises.length > 0 ? setPhase('cooldown') : handleFinishSession()}
              className="w-full bg-white text-black font-semibold rounded-xl py-4 text-lg"
            >
              {cooldownExercises.length > 0 ? 'Cooldown' : 'Terminer la seance'}
            </button>
          ) : (
            <button
              onClick={() => {
                const nextPending = exerciseStatuses.findIndex(s => s.status === 'pending')
                if (nextPending >= 0) handleOpenExercise(nextPending)
              }}
              className="w-full bg-white text-black font-semibold rounded-xl py-4 text-lg"
            >
              Continuer
            </button>
          )}
        </div>
      </div>
    )
  }

  if (phase === 'notebook' && currentProgramExercise && currentCatalogExercise) {
    const intensity = (programSession.intensity ?? 'volume') as 'heavy' | 'volume' | 'moderate'
    return (
      <ExerciseNotebook
        exercise={{
          exerciseId: currentProgramExercise.exerciseId,
          exerciseName: currentCatalogExercise.name,
          instructions: currentCatalogExercise.instructions,
          category: currentCatalogExercise.category as 'compound' | 'isolation' | 'rehab' | 'mobility' | 'core',
          primaryMuscles: currentCatalogExercise.primaryMuscles,
          isRehab: currentCatalogExercise.isRehab,
        }}
        target={{
          sets: currentProgramExercise.sets,
          reps: currentProgramExercise.targetReps,
          restSeconds: currentProgramExercise.restSeconds,
          intensity,
        }}
        exerciseIndex={currentExerciseIdx}
        totalExercises={programSession.exercises.length}
        userId={userId}
        fillerSuggestions={fillerSuggestions}
        swapOptions={swapOptions}
        onNext={handleNextExercise}
        onSkip={handleSkipExercise}
        onSwap={handleSwapExercise}
      />
    )
  }

  if (phase === 'cooldown') {
    return (
      <div className="flex flex-col h-[calc(100dvh-var(--nav-h))] overflow-hidden p-4">
        <div className="text-center mb-4">
          <p className="text-zinc-400 text-sm uppercase tracking-wider mb-1">Cooldown</p>
          <h2 className="text-xl font-bold">Etirements</h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {cooldownExercises.map((ex, i) => (
            <div key={ex.id ?? i} className="bg-zinc-900 rounded-xl px-4 py-3">
              <p className="text-white font-medium">{ex.name}</p>
              <p className="text-zinc-400 text-sm mt-1">{ex.instructions}</p>
            </div>
          ))}
          {cooldownExercises.length === 0 && (
            <p className="text-zinc-500 text-center">Pas d'etirements specifiques aujourd'hui.</p>
          )}
        </div>

        <div className="pt-3 pb-2 flex-shrink-0">
          <button
            onClick={handleFinishSession}
            className="w-full bg-white text-black font-semibold rounded-xl py-4 text-lg"
          >
            Terminer la seance
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const doneCount = exerciseStatuses.filter(s => s.status === 'done').length
    const skippedCount = exerciseStatuses.filter(s => s.status === 'skipped').length
    const duration = Math.round((Date.now() - sessionStartTime.getTime()) / 60000)

    return (
      <div className="flex flex-col items-center justify-center h-[calc(100dvh-var(--nav-h))] p-6 text-center">
        <p className="text-3xl font-bold mb-2">Bravo !</p>
        <p className="text-zinc-400 mb-6">Seance enregistree.</p>
        <div className="bg-zinc-900 rounded-xl p-4 mb-8 w-full max-w-sm text-left space-y-1">
          <p className="text-sm text-zinc-300">{doneCount} exercice{doneCount > 1 ? 's' : ''} complete{doneCount > 1 ? 's' : ''}</p>
          {skippedCount > 0 && (
            <p className="text-sm text-amber-400">{skippedCount} skip{skippedCount > 1 ? 's' : ''} (douleur)</p>
          )}
          <p className="text-sm text-zinc-500">Duree: ~{duration} min</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="bg-white text-black font-semibold rounded-xl py-4 px-8 text-lg"
        >
          Retour
        </button>
      </div>
    )
  }

  return null
}

class SessionErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
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

function parseIntSafe(val: string | null, defaultVal: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (val === null) return defaultVal
  const num = parseInt(val, 10)
  if (!Number.isInteger(num) || num < min || num > max) return defaultVal
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
