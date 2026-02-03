import { useState } from 'react'
import type { SessionExercise } from '../../db/types'
import type { SubstitutionSuggestion } from '../../hooks/useSession'
import { useExerciseNote } from '../../hooks/useExerciseNote'

interface ExerciseViewProps {
  exercise: SessionExercise
  currentSet: number
  totalSets: number
  exerciseIndex: number
  totalExercises: number
  substitutionSuggestion?: SubstitutionSuggestion | null
  userId?: number
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
  userId,
  onDone,
  onOccupied,
  onNoWeight,
  onSubstitute,
}: ExerciseViewProps) {
  const [showInstructions, setShowInstructions] = useState(false)
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteInput, setNoteInput] = useState('')

  const { note, saveNote } = useExerciseNote(userId, exercise.exerciseId)

  const handleOpenNoteEditor = () => {
    setNoteInput(note ?? '')
    setIsEditingNote(true)
  }

  const handleSaveNote = async () => {
    await saveNote(noteInput)
    setIsEditingNote(false)
  }

  const handleCancelNote = () => {
    setIsEditingNote(false)
    setNoteInput('')
  }

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

        {/* Persistent note display */}
        {note && !isEditingNote && (
          <div className="w-full max-w-md bg-blue-900/30 border border-blue-700/50 rounded-lg p-3 mb-3">
            <div className="flex items-start justify-between">
              <p className="text-blue-300 text-sm text-left flex-1">{note}</p>
              <button
                onClick={handleOpenNoteEditor}
                className="text-blue-400 text-xs ml-2 underline"
                aria-label="Modifier la note"
              >
                modifier
              </button>
            </div>
          </div>
        )}

        {/* Note editor */}
        {isEditingNote && (
          <div className="w-full max-w-md bg-zinc-800 border border-zinc-700 rounded-lg p-3 mb-3">
            <label htmlFor="note-input" className="block text-zinc-400 text-xs mb-2">
              Note pour cet exercice
            </label>
            <textarea
              id="note-input"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Ex: Grip serré, banc à 30°..."
              className="w-full bg-zinc-900 text-white text-sm rounded-lg p-2 border border-zinc-600 focus:border-blue-400 focus:outline-none resize-none"
              rows={2}
              maxLength={200}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSaveNote}
                className="flex-1 bg-blue-600 text-white text-sm font-medium rounded-lg py-2"
              >
                Enregistrer
              </button>
              <button
                onClick={handleCancelNote}
                className="flex-1 bg-zinc-700 text-white text-sm rounded-lg py-2"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Add note button if no note exists */}
        {!note && !isEditingNote && userId && (
          <button
            onClick={handleOpenNoteEditor}
            className="text-zinc-500 text-sm mb-3 underline underline-offset-2"
          >
            + Ajouter une note
          </button>
        )}

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
              aria-expanded={showInstructions}
              aria-label={showInstructions ? 'Masquer les consignes' : 'Voir les consignes'}
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
