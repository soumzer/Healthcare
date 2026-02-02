import { useEffect } from 'react'

interface RestTimerProps {
  restSeconds: number
  restElapsed: number
  nextSet: number
  totalSets: number
  nextWeightKg: number
  nextReps: number
  exerciseName: string
  onSkip: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function RestTimer({
  restSeconds,
  restElapsed,
  nextSet,
  totalSets,
  nextWeightKg,
  nextReps,
  exerciseName,
  onSkip,
}: RestTimerProps) {
  const remaining = Math.max(0, restSeconds - restElapsed)
  const progress = Math.min(1, restElapsed / restSeconds)
  const isDone = remaining === 0

  useEffect(() => {
    if (isDone) {
      navigator.vibrate?.(200)
    }
  }, [isDone])

  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] p-4 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <p className="text-zinc-400 text-sm uppercase tracking-wider mb-4">
          Repos
        </p>

        {/* Timer display */}
        <p className={`text-5xl font-bold mb-2 ${isDone ? 'text-emerald-400' : 'text-white'}`}>
          {formatTime(remaining)}
        </p>
        <p className="text-zinc-400 text-sm mb-6">/ {formatTime(restSeconds)}</p>

        {/* Progress bar */}
        <div className="w-full max-w-xs h-2 bg-zinc-800 rounded-full overflow-hidden mb-8">
          <div
            className="h-full bg-white rounded-full transition-all duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Next set info */}
        <p className="text-zinc-400 text-sm mb-1">{exerciseName}</p>
        <p className="text-zinc-300 text-lg">
          Série suivante : {nextSet}/{totalSets} &middot;{' '}
          {nextWeightKg > 0 ? `${nextWeightKg}kg` : 'Poids du corps'} &times;{' '}
          {nextReps}
        </p>
      </div>

      <div className="pb-4">
        <button
          onClick={onSkip}
          className={`w-full font-semibold rounded-xl py-4 text-lg ${
            isDone
              ? 'bg-white text-black animate-pulse'
              : 'bg-zinc-800 text-white'
          }`}
        >
          {isDone ? 'Go !' : 'Passer le repos'}
        </button>
      </div>
    </div>
  )
}
