import type { RehabExerciseInfo } from '../../engine/rehab-integrator'

interface WarmupRehabViewProps {
  rehabExercises: RehabExerciseInfo[]
  onComplete: () => void
}

export default function WarmupRehabView({
  rehabExercises,
  onComplete,
}: WarmupRehabViewProps) {
  if (rehabExercises.length === 0) return null

  return (
    <div className="flex flex-col min-h-[80vh] p-4">
      <div className="flex-1">
        <div className="text-center mb-6">
          <p className="text-zinc-400 text-sm uppercase tracking-wider mb-2">
            Echauffement rehab
          </p>
          <p className="text-lg font-bold">
            Exercices de preparation
          </p>
        </div>

        <div className="space-y-4">
          {rehabExercises.map((ex, index) => (
            <div key={index} className="bg-zinc-900 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-white font-medium">{ex.exerciseName}</p>
                <span className="bg-amber-900/40 text-amber-400 text-xs px-2 py-0.5 rounded-full">
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
          Continuer
        </button>
      </div>
    </div>
  )
}
