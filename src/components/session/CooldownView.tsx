import { useState } from 'react'
import type { RehabExerciseInfo } from '../../engine/rehab-integrator'

interface CooldownViewProps {
  cooldownExercises: RehabExerciseInfo[]
  onComplete: () => void
  onSubstitute?: (index: number, newExerciseName: string) => void
}

export default function CooldownView({
  cooldownExercises,
  onComplete,
  onSubstitute,
}: CooldownViewProps) {
  const [done, setDone] = useState<Set<number>>(new Set())
  const [showAlternatives, setShowAlternatives] = useState<number | null>(null)

  if (cooldownExercises.length === 0) return null

  return (
    <div className="flex flex-col min-h-[80vh] p-4">
      <div className="flex-1">
        <div className="text-center mb-6">
          <p className="text-zinc-400 text-sm uppercase tracking-wider mb-2">
            Retour au calme
          </p>
          <p className="text-lg font-bold">
            Exercices de récupération
          </p>
        </div>

        <div className="space-y-4">
          {cooldownExercises.map((ex, index) => (
            <div key={index} className="relative">
              <button
                onClick={() => setDone(prev => {
                  const next = new Set(prev)
                  if (next.has(index)) {
                    next.delete(index)
                  } else {
                    next.add(index)
                  }
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

              {/* Switch button when alternatives exist */}
              {ex.alternatives && ex.alternatives.length > 0 && onSubstitute && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowAlternatives(showAlternatives === index ? null : index)
                  }}
                  className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 p-1"
                  title="Changer d'exercice"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
                  </svg>
                </button>
              )}

              {/* Alternatives dropdown */}
              {showAlternatives === index && ex.alternatives && ex.alternatives.length > 0 && (
                <div className="mt-2 bg-zinc-800 rounded-lg p-2 border border-zinc-700">
                  <p className="text-xs text-zinc-400 mb-2 px-2">Alternatives disponibles :</p>
                  {ex.alternatives.map((alt, altIndex) => (
                    <button
                      key={altIndex}
                      onClick={() => {
                        onSubstitute?.(index, alt)
                        setShowAlternatives(null)
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-zinc-700 rounded-md"
                    >
                      {alt}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
