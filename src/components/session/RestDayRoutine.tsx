import { useState, useMemo } from 'react'
import type { HealthCondition } from '../../db/types'
import { generateRestDayRoutine, type RestDayExercise } from '../../engine/rest-day'

interface Props {
  conditions: HealthCondition[]
  onComplete: () => void
  onSkip: () => void
}

export default function RestDayRoutine({ conditions, onComplete, onSkip }: Props) {
  const routine = useMemo(() => generateRestDayRoutine(conditions), [conditions])
  const [checked, setChecked] = useState<Set<number>>(() => new Set())

  function toggleExercise(index: number) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const allDone = checked.size === routine.exercises.length

  return (
    <div className="flex flex-col min-h-[80vh] p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="text-zinc-400 text-sm uppercase tracking-wider mb-1">
          Jour de repos
        </p>
        <h2 className="text-xl font-bold">
          Routine du jour &middot; ~{routine.totalMinutes} min
        </h2>
      </div>

      {/* Exercise list */}
      <div className="flex-1 space-y-3">
        {routine.exercises.map((exercise, index) => (
          <ExerciseRow
            key={exercise.name}
            exercise={exercise}
            isDone={checked.has(index)}
            onToggle={() => toggleExercise(index)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3 pt-6 pb-4">
        <button
          onClick={onComplete}
          disabled={!allDone}
          className={`w-full font-semibold rounded-xl py-4 text-lg transition-colors ${
            allDone
              ? 'bg-green-600 text-white'
              : 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
          }`}
        >
          Terminer
        </button>
        <button
          onClick={onSkip}
          className="w-full bg-zinc-800 text-white rounded-xl py-4 text-lg"
        >
          Passer
        </button>
      </div>
    </div>
  )
}

function ExerciseRow({
  exercise,
  isDone,
  onToggle,
}: {
  exercise: RestDayExercise
  isDone: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full bg-zinc-900 rounded-xl px-4 py-3 flex items-center gap-3 text-left transition-colors"
    >
      {/* Checkbox */}
      <div
        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          isDone
            ? 'bg-green-600 border-green-600'
            : 'border-zinc-600 bg-transparent'
        }`}
      >
        {isDone && (
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Exercise info */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate ${isDone ? 'text-zinc-400 line-through' : 'text-white'}`}>
          {exercise.name}
        </p>
        {exercise.notes && (
          <p className="text-zinc-500 text-xs mt-0.5 truncate">{exercise.notes}</p>
        )}
      </div>

      {/* Sets x Reps */}
      <div className="text-right flex-shrink-0">
        {exercise.isExternal ? (
          <span className={`text-sm font-medium ${isDone ? 'text-green-500' : 'text-zinc-400'}`}>
            {isDone ? 'Fait' : 'Pas fait'}
          </span>
        ) : (
          <span className="text-sm text-zinc-400 font-medium">
            {exercise.sets}&times;{exercise.reps}
          </span>
        )}
      </div>
    </button>
  )
}
