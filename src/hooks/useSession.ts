import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { SessionEngine, type ExerciseHistory, type SessionEngineOptions } from '../engine/session-engine'
import { generateWarmupSets, type WarmupSet } from '../engine/warmup'
import { suggestFiller, type FillerSuggestion } from '../engine/filler'
import { integrateRehab, type RehabExerciseInfo } from '../engine/rehab-integrator'
import { db } from '../db'
import type {
  ProgramSession,
  SessionExercise,
  Exercise,
  BodyZone,
  HealthCondition,
  PainCheck,
  SessionSet,
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
  | 'end_pain_check'
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
}

export interface UseSessionReturn {
  phase: SessionPhase
  currentExercise: SessionExercise | null
  currentSetNumber: number
  totalSets: number
  warmupSets: WarmupSet[]
  warmupSetIndex: number
  fillerSuggestion: FillerSuggestion | null
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
  selectAlternativeWeight: (weightKg: number, adjustedReps: number) => void
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
  } = params

  // Build engine options from params
  const engineOptions: SessionEngineOptions = {
    availableWeights,
    phase: trainingPhase,
  }

  const engineRef = useRef<SessionEngine>(new SessionEngine(programSession, history, engineOptions))
  const engine = engineRef.current

  const [phase, setPhase] = useState<SessionPhase>('warmup')
  const [warmupSetIndex, setWarmupSetIndex] = useState(0)
  const [restElapsed, setRestElapsed] = useState(0)
  const [alternativeWeight, setAlternativeWeight] = useState<number | null>(null)
  const [alternativeReps, setAlternativeReps] = useState<number | null>(null)
  const [, forceUpdate] = useState(0)

  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartRef = useRef(new Date())
  const setStartRef = useRef<Date | null>(null)

  // Integrate rehab exercises into session
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

  // Derive current state from engine
  const currentExercise = engine.isSessionComplete() ? null : engine.getCurrentExercise()
  const currentSetNumber = engine.isSessionComplete() ? 0 : engine.getCurrentSetNumber()
  const totalSets = currentExercise?.prescribedSets ?? 0
  const exerciseIndex = engine.isSessionComplete()
    ? programSession.exercises.length
    : programSession.exercises.findIndex(
        (e) => e.exerciseId === currentExercise?.exerciseId
      )
  const totalExercises = programSession.exercises.length

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

  const startRestTimer = useCallback(() => {
    setRestElapsed(0)
    setPhase('rest_timer')
    if (restTimerRef.current) clearInterval(restTimerRef.current)
    restTimerRef.current = setInterval(() => {
      setRestElapsed((prev) => prev + 1)
    }, 1000)
  }, [])

  const stopRestTimer = useCallback(() => {
    if (restTimerRef.current) {
      clearInterval(restTimerRef.current)
      restTimerRef.current = null
    }
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

      // Save exercise progress for each completed exercise
      for (const ex of allExercises) {
        if (ex.status === 'completed' && ex.sets.length > 0) {
          const avgRIR =
            ex.sets.reduce((sum, s) => sum + (s.repsInReserve ?? 0), 0) /
            ex.sets.length
          const avgRest =
            ex.sets.reduce(
              (sum, s) => sum + (s.restActualSeconds ?? s.restPrescribedSeconds),
              0
            ) / ex.sets.length

          await db.exerciseProgress.add({
            userId,
            exerciseId: ex.exerciseId,
            exerciseName: exerciseNames[ex.exerciseId] ?? '',
            date: now,
            sessionId: 0, // Will be updated if needed
            weightKg: ex.sets[0]?.actualWeightKg ?? 0,
            reps: ex.sets.reduce((sum, s) => sum + (s.actualReps ?? 0), 0),
            sets: ex.sets.length,
            avgRepsInReserve: avgRIR,
            avgRestSeconds: avgRest,
            exerciseOrder: ex.order,
            phase: trainingPhase ?? 'hypertrophy',
            weekNumber: 1,
          })
        }
      }
    },
    [engine, userId, programId, programSession.name, exerciseNames, trainingPhase]
  )

  const advanceExerciseOrEnd = useCallback(async () => {
    engine.completeExercise()
    forceUpdate((n) => n + 1)
    if (engine.isSessionComplete()) {
      // If there are cooldown rehab exercises, show cooldown first
      if (rehabIntegration.cooldownRehab.length > 0) {
        setPhase('cooldown')
      } else if (userConditions.length > 0) {
        setPhase('end_pain_check')
      } else {
        // No cooldown, no pain check — save session and finish
        await saveSessionToDb([])
        setPhase('done')
      }
    } else {
      setWarmupSetIndex(0)
      setPhase('warmup')
    }
  }, [engine, rehabIntegration.cooldownRehab.length, userConditions.length, saveSessionToDb])

  const completeWarmupRehab = useCallback(() => {
    setPhase('warmup')
  }, [])

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
      const set: SessionSet = {
        setNumber: engine.getCurrentSetNumber(),
        prescribedReps: currentExercise?.prescribedReps ?? 0,
        prescribedWeightKg: alternativeWeight ?? currentExercise?.prescribedWeightKg ?? 0,
        actualReps: reps,
        actualWeightKg: weightKg,
        repsInReserve: rir,
        painReported: !!pain,
        painZone: pain?.zone,
        painLevel: pain?.level,
        restPrescribedSeconds: restSeconds,
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

      // Reset alternative weight
      setAlternativeWeight(null)
      setAlternativeReps(null)

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
    engine.markMachineFree()
    setPhase('exercise')
    forceUpdate((n) => n + 1)
  }, [engine])

  const openWeightPicker = useCallback(() => {
    setPhase('weight_picker')
  }, [])

  const selectAlternativeWeight = useCallback(
    (weightKg: number, adjustedReps: number) => {
      setAlternativeWeight(weightKg)
      setAlternativeReps(adjustedReps)
      setPhase('exercise')
    },
    []
  )

  const completeCooldown = useCallback(async () => {
    if (userConditions.length > 0) {
      setPhase('end_pain_check')
    } else {
      // No conditions to check, save session and go to done
      await saveSessionToDb([])
      setPhase('done')
    }
  }, [userConditions.length, saveSessionToDb])

  const completeRestTimer = useCallback(() => {
    stopRestTimer()
    setPhase('exercise')
  }, [stopRestTimer])

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
        }
      : null,
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
    selectAlternativeWeight,
    completeCooldown,
    completeRestTimer,
    submitPainChecks,
  }
}
