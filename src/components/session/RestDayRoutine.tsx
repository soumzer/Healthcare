import { useState, useMemo } from 'react'
import type { HealthCondition } from '../../db/types'
import { generateRestDayRoutine, type RestDayExercise, type RestDayVariant } from '../../engine/rest-day'

const VARIANT_LABELS: Record<RestDayVariant, string> = {
  upper: 'Haut du corps',
  lower: 'Bas du corps',
  all: 'Routine complete',
}

interface Props {
  conditions: HealthCondition[]
  variant?: RestDayVariant
  onComplete: () => void
  onSkip: () => void
}

export default function RestDayRoutine({ conditions, variant = 'all', onComplete, onSkip }: Props) {
  const routine = useMemo(() => generateRestDayRoutine(conditions, variant), [conditions, variant])
  const [checked, setChecked] = useState<Set<number>>(() => new Set())
  const [expanded, setExpanded] = useState<number | null>(null)

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

  function toggleExpand(index: number) {
    setExpanded(prev => prev === index ? null : index)
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
          {VARIANT_LABELS[variant]} &middot; ~{routine.totalMinutes} min
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          Appuie sur un exercice pour voir les details
        </p>
      </div>

      {/* Exercise list */}
      <div className="flex-1 space-y-3">
        {routine.exercises.map((exercise, index) => (
          <ExerciseRow
            key={exercise.name}
            exercise={exercise}
            isDone={checked.has(index)}
            isExpanded={expanded === index}
            onToggle={() => toggleExercise(index)}
            onExpand={() => toggleExpand(index)}
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
              ? 'bg-emerald-600 text-white'
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

const INTENSITY_LABELS: Record<string, { label: string; className: string }> = {
  very_light: { label: 'Tres leger', className: 'text-emerald-400 bg-emerald-900/30' },
  light: { label: 'Leger', className: 'text-blue-400 bg-blue-900/30' },
  moderate: { label: 'Modere', className: 'text-amber-400 bg-amber-900/30' },
}

function ExerciseRow({
  exercise,
  isDone,
  isExpanded,
  onToggle,
  onExpand,
}: {
  exercise: RestDayExercise
  isDone: boolean
  isExpanded: boolean
  onToggle: () => void
  onExpand: () => void
}) {
  const intensityInfo = INTENSITY_LABELS[exercise.intensity]

  return (
    <div className="bg-zinc-900 rounded-xl overflow-hidden">
      {/* Header row — tap to expand */}
      <button
        onClick={onExpand}
        className="w-full px-4 py-3 flex items-center gap-3 text-left"
      >
        {/* Checkbox — stop propagation to toggle independently */}
        <div
          onClick={(e) => { e.stopPropagation(); onToggle() }}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isDone
              ? 'bg-emerald-600 border-emerald-600'
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

        {/* Exercise name + badge */}
        <div className="flex-1 min-w-0">
          <p className={`font-medium ${isDone ? 'text-zinc-400 line-through' : 'text-white'}`}>
            {exercise.name}
          </p>
          {!exercise.isExternal && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-zinc-400 text-xs">
                {exercise.sets}&times;{exercise.reps}
              </span>
              {intensityInfo && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${intensityInfo.className}`}>
                  {intensityInfo.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand chevron */}
        <svg
          className={`w-5 h-5 text-zinc-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded details */}
      {isExpanded && exercise.notes && (
        <div className="px-4 pb-3 pt-0 border-t border-zinc-800">
          <p className="text-zinc-400 text-sm leading-relaxed mt-3">
            {exercise.notes}
          </p>
        </div>
      )}
    </div>
  )
}
