import type { RehabExerciseInfo } from '../../engine/rehab-integrator'

interface CooldownViewProps {
  cooldownExercises: RehabExerciseInfo[]
  onComplete: () => void
}

export default function CooldownView({
  cooldownExercises,
  onComplete,
}: CooldownViewProps) {
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
            <div key={index} className="bg-zinc-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white font-medium">{ex.exerciseName}</p>
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
            </div>
          ))}
        </div>
      </div>

      <div className="pb-4 pt-6">
        <button
          onClick={onComplete}
          className="w-full bg-white text-black font-semibold rounded-xl py-4 text-lg"
        >
          Terminer le retour au calme
        </button>
      </div>
    </div>
  )
}
