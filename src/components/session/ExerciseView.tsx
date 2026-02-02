import type { SessionExercise } from '../../db/types'

interface ExerciseViewProps {
  exercise: SessionExercise
  currentSet: number
  totalSets: number
  exerciseIndex: number
  totalExercises: number
  onDone: () => void
  onOccupied: () => void
  onNoWeight: () => void
}

export default function ExerciseView({
  exercise,
  currentSet,
  totalSets,
  exerciseIndex,
  totalExercises,
  onDone,
  onOccupied,
  onNoWeight,
}: ExerciseViewProps) {
  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] p-4 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <p className="text-zinc-400 text-sm mb-1">
          Exercice {exerciseIndex + 1}/{totalExercises}
        </p>
        <h2 className="text-lg font-bold mb-6">{exercise.exerciseName}</h2>

        <p className="text-3xl font-bold">
          {currentSet}/{totalSets} &middot;{' '}
          {exercise.prescribedWeightKg > 0
            ? `${exercise.prescribedWeightKg}kg`
            : 'Poids du corps'}{' '}
          &times; {exercise.prescribedReps}
        </p>
      </div>

      <div className="space-y-3 pb-4">
        <button
          onClick={onDone}
          className="w-full bg-white text-black font-semibold rounded-xl py-4 text-lg"
        >
          Fait
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onOccupied}
            className="bg-zinc-800 text-white rounded-xl py-4 text-base"
          >
            Occupe
          </button>
          <button
            onClick={onNoWeight}
            className="bg-zinc-800 text-white rounded-xl py-4 text-base"
          >
            Pas ce poids
          </button>
        </div>
      </div>
    </div>
  )
}
