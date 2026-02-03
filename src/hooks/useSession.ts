import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { SessionEngine, type ExerciseHistory, type SessionEngineOptions } from '../engine/session-engine'
import { generateWarmupSets, type WarmupSet } from '../engine/warmup'
import { suggestFiller, type FillerSuggestion } from '../engine/filler'
import { integrateRehab, type RehabExerciseInfo } from '../engine/rehab-integrator'
import { getPhaseRecommendation } from '../engine/progression'
import { db } from '../db'
import type { PainAdjustment } from '../engine/pain-feedback'
import type {
  ProgramSession,
  SessionExercise,
  Exercise,
  BodyZone,
  HealthCondition,
  PainCheck,
  SessionSet,
  TrainingPhase,
} from '../db/types'

export type SessionPhase =
  | 'warmup'
  | 'warmup_rehab'
  | 'exercise'
  | 'set_logger'
  | 'rest_timer'
  | 'occupied'
  | 'weight_picker'
  | 'cooldown'
  | 'done'

export interface UseSessionParams {
  programSession: ProgramSession
  history: ExerciseHistory
  userId: number
  programId: number
  userConditions: BodyZone[]
  availableExercises: Exercise[]
  exerciseNames: Record<number, string>
  healthConditions?: HealthCondition[]
  availableWeights?: number[]
  phase?: 'hypertrophy' | 'strength' | 'deload'
  painAdjustments?: PainAdjustment[]
}

export interface SubstitutionSuggestion {
  name: string
  exerciseId: number
}

interface SavedSessionState {
  version: number // Schema version for detecting incompatible states
  programId: number
  sessionIndex: number
  engineExerciseIndex: number
  engineCompletedSets: number
  phase: SessionPhase
  alternativeWeight: number | null
  alternativeReps: number | null
  warmupSetIndex: number
  sessionStartTime: string
  timestamp: number
  timerEndTime: number | null
}

const SESSION_STATE_VERSION = 1

export interface UseSessionReturn {
  phase: SessionPhase
  currentExercise: SessionExercise | null
  currentSetNumber: number
  totalSets: number
  warmupSets: WarmupSet[]
  warmupSetIndex: number
  fillerSuggestion: FillerSuggestion | null
  substitutionSuggestion: SubstitutionSuggestion | null
  restSeconds: number
  restElapsed: number
  userConditions: BodyZone[]
  exerciseIndex: number
  totalExercises: number

  // Rehab integration
  warmupRehab: RehabExerciseInfo[]
  activeWaitPool: RehabExerciseInfo[]
  cooldownRehab: RehabExerciseInfo[]

  // Actions
  completeWarmupRehab: () => void
  completeWarmup: () => void
  skipWarmup: () => void
  completeWarmupSet: () => void
  startSet: () => void
  logSet: (reps: number, weightKg: number, rir: number, pain?: { zone: BodyZone; level: number }) => void
  markOccupied: () => void
  markMachineFree: () => void
  openWeightPicker: () => void
  cancelWeightPicker: () => void
  selectAlternativeWeight: (weightKg: number, adjustedReps: number) => void
  substituteExercise: (newExerciseId: number) => Promise<void>
  completeCooldown: () => Promise<void> | void
  completeRestTimer: () => void
  submitPainChecks: (checks: PainCheck[]) => Promise<void>
}

export function useSession(params: UseSessionParams): UseSessionReturn {
  const {
    programSession,
    history,
    userId,
    programId,
    userConditions,
    availableExercises,
    exerciseNames,
    healthConditions,
    availableWeights,
    phase: trainingPhase,
    painAdjustments,
  } = params

  // Build engine options from params
  const engineOptions: SessionEngineOptions = {
    availableWeights,
    phase: trainingPhase,
    sessionIntensity: programSession.intensity,
  }

  // Restore session state from sessionStorage if available
  // Uses atomic check: version mismatch or corruption triggers full clear
  let saved: SavedSessionState | null = null
  try {
    const savedRaw = sessionStorage.getItem('activeSession')
    if (savedRaw) {
      const parsed = JSON.parse(savedRaw) as SavedSessionState
      // Validate version and required fields to detect corruption/stale state
      if (
        parsed.version === SESSION_STATE_VERSION &&
        typeof parsed.programId === 'number' &&
        typeof parsed.timestamp === 'number'
      ) {
        saved = parsed
      } else {
        // Version mismatch or corrupted state - clear atomically
        sessionStorage.removeItem('activeSession')
      }
    }
  } catch {
    // JSON parse error or other issue - clear atomically
    sessionStorage.removeItem('activeSession')
  }
  const isRestorable = saved
    && saved.programId === programId
    && saved.sessionIndex === programSession.order
    && (Date.now() - saved.timestamp) < 3 * 60 * 60 * 1000 // expire after 3h

  const engineRef = useRef<SessionEngine | null>(null)
  if (engineRef.current === null) {
    engineRef.current = new SessionEngine(programSession, history, engineOptions)
    if (painAdjustments?.length) {
      engineRef.current.applyPainAdjustments(painAdjustments)
    }
    // Restore engine position if saved session is valid
    if (isRestorable && saved) {
      for (let i = 0; i < saved.engineExerciseIndex; i++) {
        engineRef.current.completeExercise()
      }
    }
  }
  const engine = engineRef.current

  // Integrate rehab exercises into session (computed early for initial phase)
  const rehabIntegration = useMemo(() => {
    if (!healthConditions || healthConditions.length === 0) {
      return { warmupRehab: [], activeWaitPool: [], cooldownRehab: [] }
    }
    const integrated = integrateRehab(programSession, healthConditions)
    return {
      warmupRehab: integrated.warmupRehab,
      activeWaitPool: integrated.activeWaitPool,
      cooldownRehab: integrated.cooldownRehab,
    }
  }, [programSession, healthConditions])

  // Start with warmup_rehab if rehab exercises exist, then warmup if sets exist, else exercise
  const [phase, setPhase] = useState<SessionPhase>(() => {
    if (isRestorable && saved) return saved.phase
    if (rehabIntegration.warmupRehab.length > 0) return 'warmup_rehab'
    const firstEx = engineRef.current!.getCurrentExercise()
    if (firstEx) {
      const ws = generateWarmupSets(firstEx.prescribedWeightKg, availableWeights)
      if (ws.length > 0) return 'warmup'
    }
    return 'exercise'
  })
  const [warmupSetIndex, setWarmupSetIndex] = useState(
    isRestorable && saved ? saved.warmupSetIndex : 0
  )
  // Restore restElapsed from timerEndTime if session was in rest_timer phase
  const [restElapsed, setRestElapsed] = useState(() => {
    if (isRestorable && saved && saved.phase === 'rest_timer' && saved.timerEndTime) {
      const remainingMs = saved.timerEndTime - Date.now()
      if (remainingMs > 0) {
        // Calculate how much time has elapsed since rest started
        // restSeconds is not available here, so we compute elapsed from endTime
        // We need to derive restSeconds from the saved state context
        const programExRestSeconds = programSession.exercises.find(
          (_, idx) => idx === saved.engineExerciseIndex
        )?.restSeconds ?? 120
        const elapsedSeconds = programExRestSeconds - Math.ceil(remainingMs / 1000)
        return Math.max(0, elapsedSeconds)
      }
      // Timer expired while away - show as complete (restElapsed >= restSeconds)
      return 9999
    }
    return 0
  })
  const [alternativeWeight, setAlternativeWeight] = useState<number | null>(
    isRestorable && saved ? saved.alternativeWeight : null
  )
  const [alternativeReps, setAlternativeReps] = useState<number | null>(
    isRestorable && saved ? saved.alternativeReps : null
  )
  const [, forceUpdate] = useState(0)

  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartRef = useRef(
    isRestorable && saved ? new Date(saved.sessionStartTime) : new Date()
  )
  const setStartRef = useRef<Date | null>(null)
  const lastRestElapsedRef = useRef<number>(0)
  const timerEndTimeRef = useRef<number | null>(
    isRestorable && saved ? saved.timerEndTime : null
  )

  // Derive current state from engine
  const currentExercise = engine.isSessionComplete() ? null : engine.getCurrentExercise()
  const currentSetNumber = engine.isSessionComplete() ? 0 : engine.getCurrentSetNumber()
  const totalSets = currentExercise?.prescribedSets ?? 0
  const exerciseIndex = engine.isSessionComplete()
    ? programSession.exercises.length
    : programSession.exercises.findIndex(
        (e) => e.exerciseId === currentExercise?.exerciseId
      )
  const totalExercises = engine.getAllExercises().length

  // Generate warmup sets for current exercise
  const warmupSets = currentExercise
    ? generateWarmupSets(currentExercise.prescribedWeightKg, availableWeights)
    : []

  // Get filler suggestion for occupied state (uses rehab active wait pool)
  const [completedFillers, setCompletedFillers] = useState<string[]>([])
  const fillerSuggestion = currentExercise
    ? suggestFiller({
        activeWaitPool: rehabIntegration.activeWaitPool,
        nextExerciseMuscles:
          availableExercises.find((e) => e.id === currentExercise.exerciseId)
            ?.primaryMuscles ?? [],
        completedFillers,
        allExercises: availableExercises,
      })
    : null

  // Rest seconds from program
  const restSeconds =
    programSession.exercises.find(
      (e) => e.exerciseId === currentExercise?.exerciseId
    )?.restSeconds ?? 120

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current)
      }
    }
  }, [])

  // Resume rest timer interval if session was restored in rest_timer phase
  useEffect(() => {
    if (isRestorable && saved?.phase === 'rest_timer' && saved.timerEndTime) {
      const remainingMs = saved.timerEndTime - Date.now()
      if (remainingMs > 0) {
        // Timer still running - start the interval
        const endTime = saved.timerEndTime
        // Get restSeconds for the current exercise from the saved state
        const programExRestSeconds = programSession.exercises.find(
          (_, idx) => idx === saved.engineExerciseIndex
        )?.restSeconds ?? 120
        restTimerRef.current = setInterval(() => {
          // Recalculate from timerEndTime to handle browser tab suspension
          const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
          const elapsed = programExRestSeconds - remaining
          setRestElapsed(elapsed)
        }, 1000)
      }
      // If remainingMs <= 0, restElapsed was already set to 9999 (expired)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run only on mount

  // Persist session state to sessionStorage for navigation resilience
  useEffect(() => {
    if (phase === 'done' || engine.isSessionComplete()) {
      sessionStorage.removeItem('activeSession')
      return
    }
    const state: SavedSessionState = {
      version: SESSION_STATE_VERSION,
      programId,
      sessionIndex: programSession.order,
      engineExerciseIndex: engine.getCurrentExerciseIndex(),
      engineCompletedSets: engine.getCurrentSetNumber() - 1,
      phase,
      alternativeWeight,
      alternativeReps,
      warmupSetIndex,
      sessionStartTime: sessionStartRef.current.toISOString(),
      timestamp: Date.now(),
      timerEndTime: timerEndTimeRef.current,
    }
    sessionStorage.setItem('activeSession', JSON.stringify(state))
  }, [phase, alternativeWeight, alternativeReps, warmupSetIndex, programId, programSession.order, engine])

  const startRestTimer = useCallback(() => {
    setRestElapsed(0)
    const endTime = Date.now() + restSeconds * 1000
    timerEndTimeRef.current = endTime
    setPhase('rest_timer')
    if (restTimerRef.current) clearInterval(restTimerRef.current)
    restTimerRef.current = setInterval(() => {
      // Recalculate from timerEndTime to handle browser tab suspension
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      const elapsed = restSeconds - remaining
      setRestElapsed(elapsed)
    }, 1000)
  }, [restSeconds])

  const stopRestTimer = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current)
      restTimerRef.current = null
    }
    timerEndTimeRef.current = null
  }, [])

  // Save session data to DB — extracted so it can be called from multiple paths
  const saveSessionToDb = useCallback(
    async (checks: PainCheck[]) => {
      const now = new Date()

      // Save pain checks
      for (const check of checks) {
        if (check.level > 0) {
          await db.painLogs.add({
            userId,
            zone: check.zone,
            level: check.level,
            context: 'end_session',
            date: now,
          })
        }
      }

      // Build exercise names onto the engine exercises
      const allExercises = engine.getAllExercises().map((ex) => ({
        ...ex,
        exerciseName: exerciseNames[ex.exerciseId] ?? '',
      }))

      // Save workout session
      await db.workoutSessions.add({
        userId,
        programId,
        sessionName: programSession.name,
        startedAt: sessionStartRef.current,
        completedAt: now,
        exercises: allExercises,
        endPainChecks: checks,
        notes: '',
      })

      // Compute weekNumber from first session date
      const firstSession = await db.workoutSessions
        .where('userId')
        .equals(userId)
        .toArray()
      const firstDate = firstSession
        .filter((s) => s.completedAt)
        .map((s) => s.completedAt!.getTime())
        .sort((a, b) => a - b)[0]
      const weekNumber = firstDate
        ? Math.floor((now.getTime() - firstDate) / (7 * 24 * 60 * 60 * 1000)) + 1
        : 1

      // Determine current phase from TrainingPhase records
      const currentPhaseRecord = await db.trainingPhases
        .where('userId')
        .equals(userId)
        .and((p) => !p.endedAt)
        .first()
      const currentPhaseName = currentPhaseRecord?.phase ?? trainingPhase ?? 'hypertrophy'
      const effectivePhase = currentPhaseName === 'transition' ? 'hypertrophy' : currentPhaseName as 'hypertrophy' | 'strength' | 'deload'

      // Save exercise progress for each completed exercise
      let progressionCount = 0
      let totalExerciseCount = 0
      for (const ex of allExercises) {
        if (ex.status === 'completed' && ex.sets.length > 0) {
          const avgRIR =
            ex.sets.reduce((sum, s) => sum + (s.repsInReserve ?? 0), 0) /
            ex.sets.length
          // Only include sets with actual rest data (skip first set which has no rest before it)
          const setsWithRest = ex.sets.filter((s) => s.restActualSeconds !== undefined)
          const avgRest = setsWithRest.length > 0
            ? setsWithRest.reduce((sum, s) => sum + (s.restActualSeconds ?? s.restPrescribedSeconds), 0) / setsWithRest.length
            : ex.sets[0]?.restPrescribedSeconds ?? 120

          // Use last set's weight (most representative of current capacity)
          const lastSet = ex.sets[ex.sets.length - 1]
          const weightKg = lastSet?.actualWeightKg ?? 0

          // Reps = average reps per set (not total)
          const avgReps = Math.round(
            ex.sets.reduce((sum, s) => sum + (s.actualReps ?? 0), 0) / ex.sets.length
          )

          // Check if any pain was reported (used for progression decisions)
          const hadPain = ex.sets.some((s) => s.painReported)

          // Get prescribed values from the program exercise definition
          const programExercise = programSession.exercises.find(
            (pe) => pe.exerciseId === ex.exerciseId
          )

          await db.exerciseProgress.add({
            userId,
            exerciseId: ex.exerciseId,
            exerciseName: exerciseNames[ex.exerciseId] ?? '',
            date: now,
            sessionId: 0,
            weightKg,
            reps: avgReps,
            repsPerSet: ex.sets.map((s) => s.actualReps ?? 0),
            sets: ex.sets.length,
            avgRepsInReserve: hadPain ? -1 : avgRIR, // -1 signals pain occurred
            avgRestSeconds: avgRest,
            exerciseOrder: ex.order,
            phase: effectivePhase,
            weekNumber,
            prescribedReps: ex.prescribedReps,
            prescribedRestSeconds: programExercise?.restSeconds,
          })

          totalExerciseCount++
          // Track whether this exercise progressed (for phase recommendation)
          const prevProgress = engine.getProgressionResult(ex.exerciseId)
          if (prevProgress && (prevProgress.action === 'increase_weight' || prevProgress.action === 'increase_reps')) {
            progressionCount++
          }
        }
      }

      // Phase transition logic: check if phase should change
      if (currentPhaseRecord && totalExerciseCount > 0) {
        const progressionConsistency = progressionCount / totalExerciseCount

        // Get average pain level from recent pain logs
        const recentPainLogs = await db.painLogs
          .where('userId')
          .equals(userId)
          .toArray()
        const last2WeeksPain = recentPainLogs.filter(
          (p) => now.getTime() - p.date.getTime() < 14 * 24 * 60 * 60 * 1000
        )
        const avgPainLevel = last2WeeksPain.length > 0
          ? last2WeeksPain.reduce((sum, p) => sum + p.level, 0) / last2WeeksPain.length
          : 0

        const mappedPhase = currentPhaseName === 'deload' ? 'hypertrophy' : currentPhaseName as 'hypertrophy' | 'transition' | 'strength'
        const recommendation = getPhaseRecommendation({
          currentPhase: mappedPhase,
          weeksInPhase: currentPhaseRecord.weekCount,
          avgPainLevel,
          progressionConsistency,
        })

        if (recommendation !== mappedPhase) {
          // Close current phase
          await db.trainingPhases.update(currentPhaseRecord.id!, {
            endedAt: now,
          })

          // Create new phase
          await db.trainingPhases.add({
            userId,
            phase: recommendation as TrainingPhase['phase'],
            startedAt: now,
            weekCount: 1,
          })
        } else {
          // Update week count
          await db.trainingPhases.update(currentPhaseRecord.id!, {
            weekCount: weekNumber,
          })
        }
      }
    },
    [engine, userId, programId, programSession, exerciseNames, trainingPhase]
  )

  const advanceExerciseOrEnd = useCallback(async () => {
    engine.completeExercise()
    setAlternativeWeight(null)
    setAlternativeReps(null)
    forceUpdate((n) => n + 1)
    if (engine.isSessionComplete()) {
      // If there are cooldown rehab exercises, show cooldown first
      if (rehabIntegration.cooldownRehab.length > 0) {
        setPhase('cooldown')
      } else {
        // No cooldown — save session and finish (pain check removed as redundant)
        await saveSessionToDb([])
        setPhase('done')
      }
    } else {
      setWarmupSetIndex(0)
      const nextEx = engine.getCurrentExercise()
      const nextWarmup = generateWarmupSets(nextEx.prescribedWeightKg, availableWeights)
      if (nextWarmup.length > 0) {
        setPhase('warmup')
      } else {
        setPhase('exercise')
      }
    }
  }, [engine, rehabIntegration.cooldownRehab.length, saveSessionToDb, availableWeights])

  const completeWarmupRehab = useCallback(() => {
    if (warmupSets.length > 0) {
      setPhase('warmup')
    } else {
      setPhase('exercise')
    }
  }, [warmupSets.length])

  const completeWarmup = useCallback(() => {
    setPhase('exercise')
  }, [])

  const skipWarmup = useCallback(() => {
    setPhase('exercise')
  }, [])

  const completeWarmupSet = useCallback(() => {
    if (warmupSetIndex < warmupSets.length - 1) {
      setWarmupSetIndex((prev) => prev + 1)
    } else {
      setPhase('exercise')
    }
  }, [warmupSetIndex, warmupSets.length])

  const startSet = useCallback(() => {
    setStartRef.current = new Date()
    setPhase('set_logger')
  }, [])

  const logSet = useCallback(
    (
      reps: number,
      weightKg: number,
      rir: number,
      pain?: { zone: BodyZone; level: number }
    ) => {
      const now = new Date()
      const setNum = engine.getCurrentSetNumber()
      const set: SessionSet = {
        setNumber: setNum,
        prescribedReps: currentExercise?.prescribedReps ?? 0,
        prescribedWeightKg: alternativeWeight ?? currentExercise?.prescribedWeightKg ?? 0,
        actualReps: reps,
        actualWeightKg: weightKg,
        repsInReserve: rir,
        painReported: !!pain,
        painZone: pain?.zone,
        painLevel: pain?.level,
        restPrescribedSeconds: restSeconds,
        restActualSeconds: setNum > 1 ? lastRestElapsedRef.current : undefined,
        completedAt: now,
      }
      engine.logSet(set)

      // Save pain log to DB if pain reported
      if (pain) {
        db.painLogs.add({
          userId,
          zone: pain.zone,
          level: pain.level,
          context: 'during_set',
          exerciseName:
            exerciseNames[currentExercise?.exerciseId ?? 0] ?? '',
          date: now,
        })
      }

      forceUpdate((n) => n + 1)

      // Check if exercise is complete
      if (engine.isCurrentExerciseComplete()) {
        advanceExerciseOrEnd()
      } else {
        startRestTimer()
      }
    },
    [
      engine,
      currentExercise,
      alternativeWeight,
      restSeconds,
      userId,
      exerciseNames,
      advanceExerciseOrEnd,
      startRestTimer,
    ]
  )

  const markOccupied = useCallback(() => {
    engine.markOccupied()
    setPhase('occupied')
    forceUpdate((n) => n + 1)
  }, [engine])

  const markMachineFree = useCallback(() => {
    // Track completed filler so it cycles to next suggestion
    if (fillerSuggestion?.name) {
      setCompletedFillers(prev => [...prev, fillerSuggestion.name])
    }
    engine.markMachineFree()
    setPhase('exercise')
    forceUpdate((n) => n + 1)
  }, [engine, fillerSuggestion])

  const openWeightPicker = useCallback(() => {
    setPhase('weight_picker')
  }, [])

  const cancelWeightPicker = useCallback(() => {
    setPhase('exercise')
  }, [])

  const selectAlternativeWeight = useCallback(
    (weightKg: number, adjustedReps: number) => {
      setAlternativeWeight(weightKg)
      setAlternativeReps(adjustedReps)
      setPhase('exercise')
    },
    []
  )

  const substituteExercise = useCallback(
    async (newExerciseId: number) => {
      if (!currentExercise) return
      const oldExerciseId = currentExercise.exerciseId

      // 1. Update the active program in DB FIRST — swap exerciseId in this slot
      const activeProgram = await db.workoutPrograms
        .where('userId').equals(userId)
        .filter(p => p.isActive)
        .first()

      // Only proceed if DB update can be performed
      if (activeProgram?.id === undefined) {
        console.error('Cannot substitute exercise: no active program found')
        return
      }

      const updatedSessions = activeProgram.sessions.map(s => ({
        ...s,
        exercises: s.exercises.map(pe =>
          pe.exerciseId === oldExerciseId
            ? { ...pe, exerciseId: newExerciseId }
            : pe
        ),
      }))

      // DB update must succeed before modifying engine state
      await db.workoutPrograms.update(activeProgram.id, { sessions: updatedSessions })

      // 2. Only update engine state AFTER DB write succeeds
      const newExData = availableExercises.find(e => e.id === newExerciseId)
      const estimatedWeight = Math.round(currentExercise.prescribedWeightKg * 0.7 * 2) / 2
      const ex = engine.getCurrentExercise()
      if (ex) {
        ex.exerciseId = newExerciseId
        ex.exerciseName = newExData?.name ?? ''
        ex.prescribedWeightKg = estimatedWeight
        ex.prescribedReps = currentExercise.prescribedReps
      }

      setAlternativeWeight(null)
      setAlternativeReps(null)
      forceUpdate(n => n + 1)
    },
    [currentExercise, userId, engine, availableExercises]
  )

  const completeCooldown = useCallback(async () => {
    // Save session and go to done (pain check removed as redundant)
    await saveSessionToDb([])
    setPhase('done')
  }, [saveSessionToDb])

  const completeRestTimer = useCallback(() => {
    lastRestElapsedRef.current = restElapsed
    stopRestTimer()
    setPhase('exercise')
  }, [stopRestTimer, restElapsed])

  const submitPainChecks = useCallback(
    async (checks: PainCheck[]) => {
      await saveSessionToDb(checks)
      setPhase('done')
    },
    [saveSessionToDb]
  )

  return {
    phase,
    currentExercise: currentExercise
      ? {
          ...currentExercise,
          exerciseName: exerciseNames[currentExercise.exerciseId] ?? '',
          prescribedWeightKg:
            alternativeWeight ?? currentExercise.prescribedWeightKg,
          prescribedReps:
            alternativeReps ?? currentExercise.prescribedReps,
          instructions:
            availableExercises.find((e) => e.id === currentExercise.exerciseId)?.instructions ?? '',
        }
      : null,
    substitutionSuggestion: (() => {
      if (!currentExercise) return null
      const result = engine.getProgressionResult(currentExercise.exerciseId)
      if (!result || result.action !== 'maintain' || !result.reason.includes('Plafond')) return null
      const exerciseData = availableExercises.find((e) => e.id === currentExercise.exerciseId)
      if (!exerciseData?.alternatives?.length) return null
      // Find an alternative that exists in the catalog
      for (const altName of exerciseData.alternatives) {
        const alt = availableExercises.find(
          (e) => e.name === altName && !e.isRehab
        )
        if (alt) return { name: altName, exerciseId: alt.id! }
      }
      return null
    })(),
    currentSetNumber,
    totalSets,
    warmupSets,
    warmupSetIndex,
    fillerSuggestion,
    restSeconds,
    restElapsed,
    userConditions,
    exerciseIndex,
    totalExercises,

    // Rehab integration
    warmupRehab: rehabIntegration.warmupRehab,
    activeWaitPool: rehabIntegration.activeWaitPool,
    cooldownRehab: rehabIntegration.cooldownRehab,

    completeWarmupRehab,
    completeWarmup,
    skipWarmup,
    completeWarmupSet,
    startSet,
    logSet,
    markOccupied,
    markMachineFree,
    openWeightPicker,
    cancelWeightPicker,
    selectAlternativeWeight,
    substituteExercise,
    completeCooldown,
    completeRestTimer,
    submitPainChecks,
  }
}
