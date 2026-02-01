import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../db'
import { useSession } from '../hooks/useSession'
import { shouldDeload } from '../engine/progression'
import { calculatePainAdjustments, type PainFeedbackEntry } from '../engine/pain-feedback'
import type { ExerciseHistory } from '../engine/session-engine'
import WarmupView from '../components/session/WarmupView'
import WarmupRehabView from '../components/session/WarmupRehabView'
import ExerciseView from '../components/session/ExerciseView'
import SetLogger from '../components/session/SetLogger'
import RestTimer from '../components/session/RestTimer'
import ActiveWait from '../components/session/ActiveWait'
import WeightPicker from '../components/session/WeightPicker'
import CooldownView from '../components/session/CooldownView'
import EndSessionPainCheck from '../components/session/EndSessionPainCheck'
import { useNavigate, useSearchParams } from 'react-router-dom'

/** Data loader — resolves all async data then renders SessionRunner */
function SessionContent({
  programId,
  sessionIndex,
}: {
  programId: number
  sessionIndex: number
}) {
  const program = useLiveQuery(() => db.workoutPrograms.get(programId))
  const user = useLiveQuery(() => db.userProfiles.toCollection().first())
  const conditions = useLiveQuery(
    () =>
      user?.id
        ? db.healthConditions.where('userId').equals(user.id).and((c) => c.isActive).toArray()
        : [],
    [user?.id]
  )
  const allExercises = useLiveQuery(() => db.exercises.toArray())
  const progressData = useLiveQuery(
    () =>
      user?.id
        ? db.exerciseProgress.where('userId').equals(user.id).toArray()
        : [],
    [user?.id]
  )
  const availableWeightsData = useLiveQuery(
    () =>
      user?.id
        ? db.availableWeights.where('userId').equals(user.id).and((w) => w.isAvailable).toArray()
        : [],
    [user?.id]
  )

  // Load recent pain logs (last 7 days) for pain feedback loop
  const recentPainLogs = useLiveQuery(
    () =>
      user?.id
        ? db.painLogs
            .where('userId')
            .equals(user.id)
            .and((p) => p.date >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            .toArray()
        : [],
    [user?.id]
  )

  // Determine current training phase and deload status
  const phaseData = useLiveQuery(
    async () => {
      if (!user?.id) return { phase: 'hypertrophy' as const, isDeload: false }

      const phases = await db.trainingPhases
        .where('userId')
        .equals(user.id)
        .toArray()
      const sortedPhases = phases.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      const currentPhase = sortedPhases.find((p) => !p.endedAt)

      if (currentPhase?.phase === 'deload') {
        return { phase: 'deload' as const, isDeload: true }
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
          .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime())[0]
        if (firstCompleted?.completedAt) {
          weeksSince = Math.floor(
            (Date.now() - firstCompleted.completedAt.getTime()) / (7 * 24 * 60 * 60 * 1000)
          )
        }
      }

      const needsDeload = shouldDeload(weeksSince)
      if (needsDeload) {
        if (currentPhase) {
          await db.trainingPhases.update(currentPhase.id!, { endedAt: new Date() })
        }
        await db.trainingPhases.add({
          userId: user.id,
          phase: 'deload',
          startedAt: new Date(),
          weekCount: 1,
        })
        return { phase: 'deload' as const, isDeload: true }
      }

      const mappedPhase = currentPhase?.phase ?? 'hypertrophy'
      const sessionPhase = mappedPhase === 'transition' ? 'hypertrophy' : mappedPhase
      return { phase: sessionPhase as 'hypertrophy' | 'strength' | 'deload', isDeload: false }
    },
    [user?.id]
  )

  const programSession = program?.sessions?.[sessionIndex]

  if (!program || !programSession || !user || !allExercises || !progressData || !phaseData || conditions === undefined || recentPainLogs === undefined) {
    return (
      <div className="p-4 text-center">
        <p className="text-zinc-400">Chargement de la seance...</p>
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
    history[exerciseId] = {
      lastWeightKg: p.weightKg,
      lastReps: Array(p.sets).fill(p.reps),
      lastAvgRIR: p.avgRepsInReserve,
      lastAvgRestSeconds: p.avgRestSeconds,
      prescribedSets: p.sets,
      prescribedReps: p.prescribedReps,
      prescribedRestSeconds: p.prescribedRestSeconds,
    }
  }

  // Build unique available weights list (undefined if empty, so engine uses defaults)
  const availableWeights = availableWeightsData && availableWeightsData.length > 0
    ? [...new Set(availableWeightsData.map((w) => w.weightKg))].sort((a, b) => a - b)
    : undefined

  // Build exercise names map
  const exerciseNames: Record<number, string> = {}
  for (const ex of allExercises) {
    if (ex.id !== undefined) exerciseNames[ex.id] = ex.name
  }

  // Build pain feedback entries from recent pain logs
  const painFeedback: PainFeedbackEntry[] = (() => {
    if (!recentPainLogs || recentPainLogs.length === 0) return []
    const byZone = new Map<string, { maxPain: number; duringExercises: Set<string> }>()
    for (const log of recentPainLogs) {
      const existing = byZone.get(log.zone) ?? { maxPain: 0, duringExercises: new Set<string>() }
      existing.maxPain = Math.max(existing.maxPain, log.level)
      if (log.context === 'during_set' && log.exerciseName) {
        existing.duringExercises.add(log.exerciseName)
      }
      byZone.set(log.zone, existing)
    }
    return Array.from(byZone.entries()).map(([zone, data]) => ({
      zone: zone as import('../db/types').BodyZone,
      maxPainLevel: data.maxPain,
      duringExercises: Array.from(data.duringExercises),
    }))
  })()

  // Build reference weights map: for each exercise, find the most recent
  // ExerciseProgress entry where avgRepsInReserve >= 0 (no pain reported;
  // pain is recorded as -1). This is the last "healthy" weight.
  const referenceWeights = useMemo(() => {
    if (!progressData || progressData.length === 0) return new Map<number, number>()
    const refMap = new Map<number, number>()
    // Group progress entries by exerciseId, sorted by date descending
    const byExercise = new Map<number, typeof progressData>()
    for (const p of progressData) {
      const list = byExercise.get(p.exerciseId) ?? []
      list.push(p)
      byExercise.set(p.exerciseId, list)
    }
    for (const [exerciseId, entries] of byExercise) {
      const sorted = entries.sort((a, b) => b.date.getTime() - a.date.getTime())
      const healthyEntry = sorted.find((e) => e.avgRepsInReserve >= 0)
      if (healthyEntry) {
        refMap.set(exerciseId, healthyEntry.weightKg)
      }
    }
    return refMap
  }, [progressData])

  // Calculate pain adjustments for session exercises
  const painAdjustments = (() => {
    if (painFeedback.length === 0) return undefined
    const sessionExercises = programSession.exercises.map((pe) => {
      const ex = allExercises.find((e) => e.id === pe.exerciseId)
      return {
        exerciseId: pe.exerciseId,
        exerciseName: ex?.name ?? exerciseNames[pe.exerciseId] ?? '',
        contraindications: ex?.contraindications ?? [],
      }
    })
    const adjustments = calculatePainAdjustments(painFeedback, sessionExercises, referenceWeights)
    return adjustments.length > 0 ? adjustments : undefined
  })()

  return (
    <SessionRunner
      programSession={programSession}
      history={history}
      userId={user.id!}
      programId={programId}
      conditions={conditions ?? []}
      allExercises={allExercises}
      exerciseNames={exerciseNames}
      availableWeights={availableWeights}
      phase={phaseData.phase}
      painAdjustments={painAdjustments}
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
  availableWeights,
  phase: phaseFromData,
  painAdjustments,
}: {
  programSession: import('../db/types').ProgramSession
  history: ExerciseHistory
  userId: number
  programId: number
  conditions: import('../db/types').HealthCondition[]
  allExercises: import('../db/types').Exercise[]
  exerciseNames: Record<number, string>
  availableWeights: number[] | undefined
  phase: 'hypertrophy' | 'strength' | 'deload'
  painAdjustments?: import('../engine/pain-feedback').PainAdjustment[]
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
    availableWeights,
    phase: phaseFromData,
    painAdjustments,
  })

  if (session.phase === 'done') {
    return (
      <div className="flex flex-col min-h-[80vh] p-4 items-center justify-center text-center">
        <p className="text-3xl font-bold mb-4">Bravo !</p>
        <p className="text-zinc-400 mb-8">Seance enregistree avec succes.</p>
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
    return (
      <WarmupRehabView
        rehabExercises={session.warmupRehab}
        onComplete={session.completeWarmupRehab}
      />
    )
  }

  if (session.phase === 'warmup') {
    return (
      <WarmupView
        exerciseName={session.currentExercise?.exerciseName ?? ''}
        warmupSets={session.warmupSets}
        currentIndex={session.warmupSetIndex}
        onComplete={session.completeWarmupSet}
        onSkip={session.skipWarmup}
      />
    )
  }

  if (session.phase === 'exercise') {
    return (
      <ExerciseView
        exercise={session.currentExercise!}
        currentSet={session.currentSetNumber}
        totalSets={session.totalSets}
        exerciseIndex={session.exerciseIndex}
        totalExercises={session.totalExercises}
        onDone={session.startSet}
        onOccupied={session.markOccupied}
        onNoWeight={session.openWeightPicker}
      />
    )
  }

  if (session.phase === 'set_logger') {
    return (
      <SetLogger
        prescribedReps={session.currentExercise?.prescribedReps ?? 8}
        prescribedWeightKg={session.currentExercise?.prescribedWeightKg ?? 0}
        userConditions={session.userConditions}
        onSubmit={session.logSet}
      />
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
    return (
      <ActiveWait
        fillerSuggestion={session.fillerSuggestion}
        onMachineFree={session.markMachineFree}
      />
    )
  }

  if (session.phase === 'weight_picker') {
    return (
      <WeightPicker
        currentWeightKg={session.currentExercise?.prescribedWeightKg ?? 0}
        prescribedReps={session.currentExercise?.prescribedReps ?? 0}
        availableWeights={availableWeights}
        onSelect={session.selectAlternativeWeight}
      />
    )
  }

  if (session.phase === 'cooldown') {
    return (
      <CooldownView
        cooldownExercises={session.cooldownRehab}
        onComplete={session.completeCooldown}
      />
    )
  }

  if (session.phase === 'end_pain_check') {
    return (
      <EndSessionPainCheck
        userConditions={session.userConditions}
        onSubmit={session.submitPainChecks}
        userId={userId}
      />
    )
  }

  return null
}

export default function SessionPage() {
  const [searchParams] = useSearchParams()
  const programId = parseInt(searchParams.get('programId') ?? '1')
  const sessionIndex = parseInt(searchParams.get('sessionIndex') ?? '0')

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SessionContent programId={programId} sessionIndex={sessionIndex} />
    </div>
  )
}
