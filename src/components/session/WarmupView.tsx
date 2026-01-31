import type { WarmupSet } from '../../engine/warmup'

interface WarmupViewProps {
  exerciseName: string
  warmupSets: WarmupSet[]
  currentIndex: number
  onComplete: () => void
  onSkip: () => void
}

export default function WarmupView({
  exerciseName,
  warmupSets,
  currentIndex,
  onComplete,
  onSkip,
}: WarmupViewProps) {
  const current = warmupSets[currentIndex]
  if (!current) return null

  return (
    <div className="flex flex-col min-h-[80vh] p-4">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <p className="text-zinc-400 text-sm uppercase tracking-wider mb-2">
          Echauffement
        </p>
        <h2 className="text-lg font-bold mb-6">{exerciseName}</h2>

        <p className="text-zinc-400 text-sm mb-2">
          {currentIndex + 1}/{warmupSets.length} &middot; {current.label}
        </p>
        <p className="text-3xl font-bold">
          {current.weightKg > 0 ? `${current.weightKg}kg` : 'Barre a vide'}{' '}
          &times; {current.reps}
        </p>
      </div>

      <div className="space-y-3 pb-4">
        <button
          onClick={onComplete}
          className="w-full bg-white text-black font-semibold rounded-xl py-4 text-lg"
        >
          Fait
        </button>
        <button
          onClick={onSkip}
          className="w-full bg-zinc-800 text-white rounded-xl py-4 text-lg"
        >
          Passer l&apos;echauffement
        </button>
      </div>
    </div>
  )
}
