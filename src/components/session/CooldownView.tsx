import { useState } from 'react'
import type { RehabExerciseInfo } from '../../engine/rehab-integrator'

interface CooldownViewProps {
  cooldownExercises: RehabExerciseInfo[]
  onComplete: () => void
}

export default function CooldownView({
  cooldownExercises,
  onComplete,
}: CooldownViewProps) {
  const [done, setDone] = useState<Set<number>>(new Set())

  if (cooldownExercises.length === 0) return null

  return (
    <div className="flex flex-col min-h-[80vh] p-4">
      <div className="flex-1">
        <div className="text-center mb-6">
          <p className="text-zinc-400 text-sm uppercase tracking-wider mb-2">
            Retour au calme
          </p>
          <p className="text-lg font-bold">
            Exercices de recuperation
          </p>
        </div>

        <div className="space-y-4">
          {cooldownExercises.map((ex, index) => (
            <button
              key={index}
              onClick={() => setDone(prev => {
                const next = new Set(prev)
                next.has(index) ? next.delete(index) : next.add(index)
                return next
              })}
              className={`w-full text-left rounded-xl p-4 transition-opacity ${done.has(index) ? 'bg-zinc-800 opacity-60' : 'bg-zinc-900'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-white font-medium">
                  {done.has(index) && <span className="text-emerald-400 mr-2">✓</span>}
                  {ex.exerciseName}
                </p>
                <span className="bg-emerald-900/40 text-emerald-400 text-xs px-2 py-0.5 rounded-full">
                  {ex.protocolName}
                </span>
              </div>
              <p className="text-zinc-300 text-sm mb-1">
                {ex.sets} x {ex.reps} &middot; {ex.intensity}
              </p>
              {ex.notes && (
                <p className="text-zinc-400 text-sm">{ex.notes}</p>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="pb-4 pt-6">
        <button
          onClick={onComplete}
          className="w-full bg-white text-black font-semibold rounded-xl py-4 text-lg"
        >
          Terminer le retour au calme ({done.size}/{cooldownExercises.length})
        </button>
      </div>
    </div>
  )
}
