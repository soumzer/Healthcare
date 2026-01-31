import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { useSession } from '../hooks/useSession'
import type { ExerciseHistory } from '../engine/session-engine'
import WarmupView from '../components/session/WarmupView'
import ExerciseView from '../components/session/ExerciseView'
import SetLogger from '../components/session/SetLogger'
import RestTimer from '../components/session/RestTimer'
import ActiveWait from '../components/session/ActiveWait'
import WeightPicker from '../components/session/WeightPicker'
import EndSessionPainCheck from '../components/session/EndSessionPainCheck'
import { useNavigate } from 'react-router-dom'

function SessionContent({
  programId,
  sessionIndex,
}: {
  programId: number
  sessionIndex: number
}) {
  const navigate = useNavigate()

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

  // Build history from progress data
  const history: ExerciseHistory = {}
  if (progressData) {
    for (const p of progressData) {
      const existing = history[p.exerciseId]
      if (!existing || p.date > (existing as { date?: Date }).date!) {
        history[p.exerciseId] = {
          lastWeightKg: p.weightKg,
          lastReps: Array(p.sets).fill(Math.round(p.reps / p.sets)),
          lastAvgRIR: p.avgRepsInReserve,
        }
      }
    }
  }

  // Build exercise names map
  const exerciseNames: Record<number, string> = {}
  if (allExercises) {
    for (const ex of allExercises) {
      if (ex.id !== undefined) exerciseNames[ex.id] = ex.name
    }
  }

  const programSession = program?.sessions?.[sessionIndex]

  const session = useSession({
    programSession: programSession ?? { name: '', order: 0, exercises: [] },
    history,
    userId: user?.id ?? 1,
    programId,
    userConditions: conditions?.map((c) => c.bodyZone) ?? [],
    availableExercises: allExercises ?? [],
    exerciseNames,
  })

  if (!program || !programSession || !user || !allExercises) {
    return (
      <div className="p-4 text-center">
        <p className="text-zinc-400">Chargement de la seance...</p>
      </div>
    )
  }

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
        fillerExercises={session.fillerExercises}
        onMachineFree={session.markMachineFree}
      />
    )
  }

  if (session.phase === 'weight_picker') {
    return (
      <WeightPicker
        currentWeightKg={session.currentExercise?.prescribedWeightKg ?? 0}
        prescribedReps={session.currentExercise?.prescribedReps ?? 0}
        onSelect={session.selectAlternativeWeight}
      />
    )
  }

  if (session.phase === 'end_pain_check') {
    return (
      <EndSessionPainCheck
        userConditions={session.userConditions}
        onSubmit={session.submitPainChecks}
      />
    )
  }

  return null
}

export default function SessionPage() {
  // For now, use URL params or defaults
  // In production, these would come from navigation state or URL
  const params = new URLSearchParams(window.location.search)
  const programId = parseInt(params.get('programId') ?? '1')
  const sessionIndex = parseInt(params.get('sessionIndex') ?? '0')

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SessionContent programId={programId} sessionIndex={sessionIndex} />
    </div>
  )
}
