import { useState } from 'react'
import type { SessionExercise } from '../../db/types'
import type { SubstitutionSuggestion } from '../../hooks/useSession'

interface ExerciseViewProps {
  exercise: SessionExercise
  currentSet: number
  totalSets: number
  exerciseIndex: number
  totalExercises: number
  substitutionSuggestion?: SubstitutionSuggestion | null
  onDone: () => void
  onOccupied: () => void
  onNoWeight: () => void
  onSubstitute?: (exerciseId: number) => void
}

export default function ExerciseView({
  exercise,
  currentSet,
  totalSets,
  exerciseIndex,
  totalExercises,
  substitutionSuggestion,
  onDone,
  onOccupied,
  onNoWeight,
  onSubstitute,
}: ExerciseViewProps) {
  const [showInstructions, setShowInstructions] = useState(false)

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] p-4 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center text-center overflow-hidden">
        <p className="text-zinc-400 text-sm mb-1">
          Exercice {exerciseIndex + 1}/{totalExercises}
        </p>
        <h2 className="text-lg font-bold mb-4">{exercise.exerciseName}</h2>

        <p className="text-3xl font-bold mb-4">
          {currentSet}/{totalSets} &middot;{' '}
          {exercise.prescribedWeightKg > 0
            ? `${exercise.prescribedWeightKg}kg`
            : 'Poids du corps'}{' '}
          &times; {exercise.prescribedReps}
        </p>

        {substitutionSuggestion && (
          <div className="w-full max-w-md bg-amber-900/30 border border-amber-700/50 rounded-lg p-3 mb-3">
            <p className="text-amber-400 text-sm font-medium mb-1">
              Progression bloquée
            </p>
            <p className="text-zinc-400 text-xs mb-2">
              Poids max atteint. Passe à{' '}
              <span className="text-white font-semibold">{substitutionSuggestion.name}</span>{' '}
              pour continuer à progresser.
            </p>
            {onSubstitute && (
              <button
                onClick={() => onSubstitute(substitutionSuggestion.exerciseId)}
                className="w-full py-2 bg-amber-700 text-white text-sm font-semibold rounded-lg"
              >
                Changer pour {substitutionSuggestion.name}
              </button>
            )}
          </div>
        )}

        {exercise.instructions && (
          <div className="w-full max-w-md">
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-zinc-400 text-sm underline underline-offset-2"
            >
              {showInstructions ? 'Masquer les consignes' : 'Voir les consignes'}
            </button>
            {showInstructions && (
              <p className="mt-3 text-zinc-400 text-sm text-left leading-relaxed overflow-y-auto max-h-40 px-2">
                {exercise.instructions}
              </p>
            )}
          </div>
        )}
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
            Occupé
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
